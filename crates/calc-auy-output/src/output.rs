//! Representação de saída de um cálculo selado.

use num_bigint::BigInt;

use calc_auy_core::{
    AuditTrace, CalcAuyError, Committed, FlatAst, NodeData, NodeId, Rational, RoundingStrategy,
};
use calc_auy_nlg::{Srl, SrlNode, VerbalRealizer};

use crate::decimal::{clamp_decimals, format_decimal, scaled_bigint};
use crate::options::OutputOptions;

/// Visão de saída sobre um [`Committed`].
///
/// Todos os formatos derivam do estado **selado**; nenhum aceita rascunhos.
#[derive(Debug, Clone)]
pub struct Output<'a> {
    /// Resultado selado.
    committed: &'a Committed,
    /// Opções de formatação.
    options: OutputOptions,
}

impl<'a> Output<'a> {
    /// Cria uma visão de saída.
    #[must_use]
    pub const fn new(committed: &'a Committed, options: OutputOptions) -> Self {
        Self { committed, options }
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

    /// Formata o resultado como decimal, ciente da estratégia de arredondamento.
    #[must_use]
    pub fn to_string_decimal(&self) -> String {
        self.to_string_decimal_with(self.effective_decimals())
    }

    /// Formata o resultado com um número explícito de casas decimais.
    #[must_use]
    pub fn to_string_decimal_with(&self, decimals: u32) -> String {
        format_decimal(self.to_raw(), self.strategy(), decimals)
    }

    /// Retorna o resultado escalado por `10^decimals` como inteiro.
    #[must_use]
    pub fn to_scaled_bigint(&self, decimals: u32) -> BigInt {
        scaled_bigint(self.to_raw(), self.strategy(), decimals)
    }

    /// Serializa o rastro de auditoria (payload + assinatura) como JSON.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a serialização falhar.
    pub fn to_audit_trace(&self) -> Result<String, CalcAuyError> {
        let trace = AuditTrace {
            payload: self.committed.payload().clone(),
            signature: Some(self.committed.signature()),
        };
        serde_json::to_string(&trace).map_err(|error| CalcAuyError::SerializationError {
            message: error.to_string(),
        })
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
        realizer.realize(&self.srl())
    }

    /// Constrói a representação semântica (SRL) do cálculo.
    #[must_use]
    pub fn srl(&self) -> Srl {
        let ast = &self.committed.payload().ast;
        Srl {
            expression: Self::build_node(ast, ast.root()),
            result: self.to_string_decimal(),
            round_strategy: self.strategy().as_str().to_string(),
            decimals: self.effective_decimals(),
        }
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
