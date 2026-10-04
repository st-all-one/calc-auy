//! Representação de saída de um cálculo selado.

use std::sync::OnceLock;

use num_bigint::BigInt;

use calc_auy_core::{
    AuditTrace, CalcAuyError, Committed, FlatAst, NodeData, NodeId, OperationType, Rational,
    RoundingStrategy,
};
use calc_auy_nlg::{Srl, SrlNode, VerbalRealizer};

use crate::decimal::{clamp_decimals, format_decimal, scaled_bigint};
use crate::options::OutputOptions;

/// Extrai `(potência, índice)` de um expoente fracionário (`1/2`).
///
/// Reconhece tanto um literal `"1/2"` quanto a operação `Div` de dois
/// literais, que é como o parser Rust representa frações.
///
/// Compartilhado pelas renderizações LaTeX e Unicode para emitir raízes
/// (`\sqrt`, `√`) em vez de potências fracionárias.
pub(crate) fn root_info(ast: &FlatAst, id: NodeId) -> Option<(String, String)> {
    match ast.node(id)? {
        NodeData::Group { child } | NodeData::Control { child, .. } => root_info(ast, *child),
        NodeData::Literal { original_input, .. } => split_fraction(original_input),
        NodeData::Operation {
            op: OperationType::Div,
            operands,
        } => {
            if operands.len() != 2 {
                return None;
            }
            let power = literal_text(ast, *operands.first()?)?;
            let index = literal_text(ast, *operands.get(1)?)?;
            Some((power.to_string(), index.to_string()))
        }
        NodeData::Operation { .. } => None,
    }
}

/// Divide um texto `"p/q"` em `(p, q)`.
fn split_fraction(input: &str) -> Option<(String, String)> {
    let mut parts = input.split('/');
    let power = parts.next()?;
    let index = parts.next()?;
    if parts.next().is_some() || power.is_empty() || index.is_empty() {
        return None;
    }
    Some((power.to_string(), index.to_string()))
}

/// Texto original de um nó literal (atravessando grupos/controles).
fn literal_text(ast: &FlatAst, id: NodeId) -> Option<&str> {
    match ast.node(id)? {
        NodeData::Literal { original_input, .. } => Some(original_input.as_ref()),
        NodeData::Group { child } | NodeData::Control { child, .. } => literal_text(ast, *child),
        NodeData::Operation { .. } => None,
    }
}

/// Visão de saída sobre um [`Committed`].
///
/// Todos os formatos derivam do estado **selado**; nenhum aceita rascunhos.
///
/// Representações caras (LaTeX, Unicode, Mermaid, monetário e rastro de
/// auditoria) são memoizadas por instância, espelhando o `#outputCache` do
/// rascunho TypeScript.
#[derive(Debug, Clone)]
pub struct Output<'a> {
    /// Resultado selado.
    committed: &'a Committed,
    /// Opções de formatação.
    options: OutputOptions,
    /// LaTeX memoizado.
    pub(crate) latex: OnceLock<String>,
    /// Unicode memoizado.
    pub(crate) unicode: OnceLock<String>,
    /// Mermaid memoizado.
    pub(crate) mermaid: OnceLock<String>,
    /// Monetário memoizado.
    pub(crate) monetary: OnceLock<String>,
    /// Rastro de auditoria memoizado.
    pub(crate) audit_trace: OnceLock<String>,
    /// Representação semântica (SRL) memoizada.
    pub(crate) srl: OnceLock<Srl>,
    /// Decimal efetivo memoizado.
    pub(crate) decimal: OnceLock<String>,
    /// Inteiro escalonado (casas efetivas) memoizado.
    pub(crate) scaled: OnceLock<BigInt>,
}

impl<'a> Output<'a> {
    /// Cria uma visão de saída.
    #[must_use]
    pub const fn new(committed: &'a Committed, options: OutputOptions) -> Self {
        Self {
            committed,
            options,
            latex: OnceLock::new(),
            unicode: OnceLock::new(),
            mermaid: OnceLock::new(),
            monetary: OnceLock::new(),
            audit_trace: OnceLock::new(),
            srl: OnceLock::new(),
            decimal: OnceLock::new(),
            scaled: OnceLock::new(),
        }
    }

    /// Retorna a representação memoizada, renderizando-a na primeira chamada.
    pub(crate) fn cached(slot: &OnceLock<String>, render: impl FnOnce() -> String) -> String {
        slot.get_or_init(render).clone()
    }

    /// Retorna o resultado selado subjacente.
    #[must_use]
    pub const fn committed(&self) -> &'a Committed {
        self.committed
    }

    /// Retorna as opções.
    #[must_use]
    pub const fn options(&self) -> &OutputOptions {
        &self.options
    }

    /// Retorna a estratégia de arredondamento do *commit*.
    #[must_use]
    pub const fn strategy(&self) -> RoundingStrategy {
        self.committed.payload().round_strategy
    }

    /// Retorna as casas decimais efetivas.
    #[must_use]
    pub fn effective_decimals(&self) -> u32 {
        match self.options.decimals {
            Some(decimals) => clamp_decimals(decimals),
            None if self.strategy() == RoundingStrategy::None => 50,
            None => 2,
        }
    }

    /// Retorna o racional bruto (sem formatação).
    #[must_use]
    pub const fn to_raw(&self) -> &Rational {
        self.committed.result()
    }

    /// Retorna numerador e denominador brutos como strings decimais.
    #[must_use]
    pub fn to_raw_parts(&self) -> (String, String) {
        let raw = self.to_raw();
        (raw.numerator(), raw.denominator())
    }

    /// Formata o resultado como decimal, ciente da estratégia de arredondamento.
    #[must_use]
    pub fn to_string_decimal(&self) -> String {
        Self::cached(&self.decimal, || {
            self.to_string_decimal_with(self.effective_decimals())
        })
    }

    /// Formata o resultado com um número explícito de casas decimais.
    #[must_use]
    pub fn to_string_decimal_with(&self, decimals: u32) -> String {
        format_decimal(self.to_raw(), self.strategy(), decimals)
    }

    /// Retorna o resultado escalado por `10^decimals` como inteiro.
    #[must_use]
    pub fn to_scaled_bigint(&self, decimals: u32) -> BigInt {
        if decimals == self.effective_decimals() {
            return self
                .scaled
                .get_or_init(|| scaled_bigint(self.to_raw(), self.strategy(), decimals))
                .clone();
        }
        scaled_bigint(self.to_raw(), self.strategy(), decimals)
    }

    /// Serializa o rastro de auditoria (payload + assinatura) como JSON.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a serialização falhar.
    pub fn to_audit_trace(&self) -> Result<String, CalcAuyError> {
        if let Some(cached) = self.audit_trace.get() {
            return Ok(cached.clone());
        }
        let trace = AuditTrace {
            payload: self.committed.payload().clone(),
            signature: Some(self.committed.signature()),
        };
        let rendered =
            serde_json::to_string(&trace).map_err(|error| CalcAuyError::SerializationError {
                message: error.to_string(),
            })?;
        drop(self.audit_trace.set(rendered.clone()));
        Ok(rendered)
    }

    /// Serializa apenas o payload assinado como JSON.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a serialização falhar.
    pub fn to_json(&self) -> Result<String, CalcAuyError> {
        serde_json::to_string(self.committed.payload()).map_err(|error| {
            CalcAuyError::SerializationError {
                message: error.to_string(),
            }
        })
    }

    /// Gera a descrição verbal (acessibilidade) via um [`VerbalRealizer`].
    #[must_use]
    pub fn to_verbal_a11y(&self, realizer: &dyn VerbalRealizer) -> String {
        realizer.realize(self.srl_ref())
    }

    /// Constrói a representação semântica (SRL) do cálculo.
    #[must_use]
    pub fn srl(&self) -> Srl {
        self.srl_ref().clone()
    }

    /// Retorna a SRL memoizada, construindo-a na primeira chamada.
    pub(crate) fn srl_ref(&self) -> &Srl {
        self.srl.get_or_init(|| {
            let ast = &self.committed.payload().ast;
            Srl {
                expression: Self::build_node(ast, ast.root()),
                result: self.to_string_decimal(),
                round_strategy: self.strategy().as_display().to_string(),
                decimals: self.effective_decimals(),
            }
        })
    }

    /// Constrói recursivamente um nó da SRL.
    fn build_node(ast: &FlatAst, id: NodeId) -> SrlNode {
        match ast.node(id) {
            Some(NodeData::Literal { original_input, .. }) => {
                SrlNode::Literal(original_input.to_string())
            }
            Some(NodeData::Group { child }) => {
                SrlNode::Group(Box::new(Self::build_node(ast, *child)))
            }
            Some(NodeData::Control { child, .. }) => {
                SrlNode::Control(Box::new(Self::build_node(ast, *child)))
            }
            Some(NodeData::Operation { op, operands }) => SrlNode::Operation {
                op: *op,
                operands: operands
                    .iter()
                    .map(|child| Self::build_node(ast, *child))
                    .collect(),
            },
            None => SrlNode::Literal(String::new()),
        }
    }
}
