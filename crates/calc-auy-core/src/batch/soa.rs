//! Lote em `SoA` (`Vec<u64>` de numeradores e denominadores).

use crate::ast::{AstBuilder, FlatAst, NodeData, NodeId, OperationType};
use crate::error::CalcAuyError;
use crate::limits::Limits;
use crate::numeric::Rational;

/// Erro para um nó que não é operação.
fn not_an_operation(id: NodeId) -> CalcAuyError {
    CalcAuyError::InvalidInput {
        message: format!("nó {} não é uma operação", id.get()),
    }
}

/// Erro para um operando que não é literal.
fn not_a_literal(id: NodeId) -> CalcAuyError {
    CalcAuyError::InvalidInput {
        message: format!("operando {} não é literal", id.get()),
    }
}

/// Erro para valor que não cabe no caminho `Small`.
fn not_small() -> CalcAuyError {
    CalcAuyError::InvalidInput {
        message: "valor excede o caminho Small (u64/u64)".to_string(),
    }
}

/// Lote de racionais pequenos em *layout* `SoA`.
///
/// Mantém numeradores e denominadores em vetores paralelos, maximizando a
/// localidade de cache nas reduções por tile. Todos os valores são canônicos
/// (`d > 0`, `gcd == 1`).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SmallBatch {
    /// Numeradores.
    nums: Vec<u64>,
    /// Denominadores.
    dens: Vec<u64>,
}

impl SmallBatch {
    /// Cria um lote vazio.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            nums: Vec::new(),
            dens: Vec::new(),
        }
    }

    /// Cria um lote com capacidade pré-alocada.
    #[must_use]
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            nums: Vec::with_capacity(capacity),
            dens: Vec::with_capacity(capacity),
        }
    }

    /// Retorna o número de elementos.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.nums.len()
    }

    /// Retorna `true` se o lote está vazio.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.nums.is_empty()
    }

    /// Adiciona um par já canônico.
    pub fn push(&mut self, numerator: u64, denominator: u64) {
        self.nums.push(numerator);
        self.dens.push(denominator);
    }

    /// Retorna os numeradores.
    #[must_use]
    pub fn numerators(&self) -> &[u64] {
        &self.nums
    }

    /// Retorna os denominadores.
    #[must_use]
    pub fn denominators(&self) -> &[u64] {
        &self.dens
    }

    /// Retorna o par `(n, d)` de um índice, se existir.
    #[must_use]
    pub fn pair(&self, index: usize) -> Option<(u64, u64)> {
        self.nums
            .get(index)
            .copied()
            .zip(self.dens.get(index).copied())
    }

    /// Converte a partir de racionais, exigindo o caminho `Small`.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se algum valor for `Large`.
    pub fn from_rationals(values: &[Rational]) -> Result<Self, CalcAuyError> {
        let mut batch = Self::with_capacity(values.len());
        for value in values {
            let (n, d) = value.as_small().ok_or_else(not_small)?;
            batch.push(n, d);
        }
        Ok(batch)
    }

    /// Extrai os literais de uma operação da AST.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o nó não for operação, se
    /// algum operando não for literal ou se algum valor for `Large`.
    pub fn from_literals(ast: &FlatAst, id: NodeId) -> Result<Self, CalcAuyError> {
        let operands = ast.operands(id).ok_or_else(|| not_an_operation(id))?;
        let mut batch = Self::with_capacity(operands.len());
        for operand in operands {
            let value = ast
                .node(*operand)
                .and_then(|node| match node {
                    NodeData::Literal { value, .. } => Some(value),
                    _ => None,
                })
                .ok_or_else(|| not_a_literal(*operand))?;
            let (n, d) = value.as_small().ok_or_else(not_small)?;
            batch.push(n, d);
        }
        Ok(batch)
    }

    /// Converte o elemento `index` em [`Rational`].
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o índice for inválido e
    /// [`CalcAuyError::DivisionByZero`] se o denominador for zero.
    pub fn rational_at(&self, index: usize, limits: &Limits) -> Result<Rational, CalcAuyError> {
        let (n, d) = self.pair(index).ok_or_else(|| CalcAuyError::InvalidInput {
            message: format!("índice inválido: {index}"),
        })?;
        Rational::from_u64_pair(n, d, limits)
    }

    /// Converte todo o lote em racionais.
    ///
    /// # Errors
    ///
    /// Retorna erro se algum valor for inválido.
    pub fn to_rationals(&self, limits: &Limits) -> Result<Vec<Rational>, CalcAuyError> {
        let mut values = Vec::with_capacity(self.len());
        for index in 0..self.len() {
            values.push(self.rational_at(index, limits)?);
        }
        Ok(values)
    }

    /// Constrói uma `FlatAst` com uma operação achatada sobre os literais.
    ///
    /// # Errors
    ///
    /// Retorna erro se um limite for excedido.
    pub fn to_flat_ast(&self, op: OperationType, limits: &Limits) -> Result<FlatAst, CalcAuyError> {
        let mut builder = AstBuilder::with_capacity(limits, self.len().saturating_add(1));
        let mut operands = Vec::with_capacity(self.len());
        for index in 0..self.len() {
            let value = self.rational_at(index, limits)?;
            operands.push(builder.literal(value.clone(), value.to_string())?);
        }
        let root = builder.flattened_operation(op, &operands)?;
        builder.finish(root)
    }

    /// Soma exata de todos os elementos (vazio = `0`).
    ///
    /// # Errors
    ///
    /// Retorna erro se um valor for inválido ou um limite for excedido.
    pub fn sum(&self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        let values = self.to_rationals(limits)?;
        let result = crate::numeric::reduce::sum_tree(&values);
        limits.check_bits(result.bits())?;
        Ok(result)
    }

    /// Produto exato de todos os elementos (vazio = `1`).
    ///
    /// # Errors
    ///
    /// Retorna erro se um valor for inválido ou um limite for excedido.
    pub fn product(&self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        let values = self.to_rationals(limits)?;
        let result = crate::numeric::reduce::prod_tree(&values);
        limits.check_bits(result.bits())?;
        Ok(result)
    }
}
