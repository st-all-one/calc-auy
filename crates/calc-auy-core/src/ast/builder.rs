//! Construção validada da arena [`FlatAst`].

use std::sync::Arc;

use smallvec::SmallVec;

use super::flat::{FlatAst, NodeData};
use super::types::{Metadata, NodeId, OperationType, metadata_size_bytes};
use crate::error::{CalcAuyError, LimitKind};
use crate::limits::Limits;
use crate::meta_value::MetaValue;
use crate::numeric::{Rational, RoundingStrategy};

/// Converte `usize` em `u64` saturando (para mensagens de erro).
fn as_u64(value: usize) -> u64 {
    u64::try_from(value).unwrap_or(u64::MAX)
}

/// Construtor de [`FlatAst`] que impõe os [`Limits`] como invariantes.
///
/// Nenhuma árvore inválida pode ser construída: profundidade, número de nós,
/// operandos e bytes de metadata são verificados a cada inserção.
#[derive(Debug)]
pub struct AstBuilder<'limits> {
    /// Limites aplicados.
    limits: &'limits Limits,
    /// Nós acumulados.
    nodes: Vec<NodeData>,
    /// Metadados por nó (paralelo a `nodes`).
    metadata: Vec<Arc<Metadata>>,
    /// Bytes de metadados por nó (paralelo a `metadata`).
    metadata_sizes: Vec<usize>,
    /// Profundidade por nó (paralelo a `nodes`).
    depths: Vec<usize>,
    /// Total de bytes de metadata já acumulados.
    metadata_bytes: usize,
}

impl<'limits> AstBuilder<'limits> {
    /// Cria um construtor vazio com os limites fornecidos.
    #[must_use]
    pub const fn new(limits: &'limits Limits) -> Self {
        Self {
            limits,
            nodes: Vec::new(),
            metadata: Vec::new(),
            metadata_sizes: Vec::new(),
            depths: Vec::new(),
            metadata_bytes: 0,
        }
    }

    /// Cria um construtor com capacidade pré-alocada.
    #[must_use]
    pub fn with_capacity(limits: &'limits Limits, capacity: usize) -> Self {
        Self {
            limits,
            nodes: Vec::with_capacity(capacity),
            metadata: Vec::with_capacity(capacity),
            metadata_sizes: Vec::with_capacity(capacity),
            depths: Vec::with_capacity(capacity),
            metadata_bytes: 0,
        }
    }

    /// Reconstrói um construtor a partir de uma árvore existente.
    ///
    /// Retorna o construtor e a raiz atual, permitindo continuar a construção
    /// (usado na hidratação).
    #[must_use]
    pub fn from_ast(ast: FlatAst, limits: &'limits Limits) -> (Self, NodeId) {
        let (nodes, metadata, depths, root) = ast.into_parts();
        let metadata_sizes: Vec<usize> = metadata
            .iter()
            .map(|entry| metadata_size_bytes(entry.as_ref()))
            .collect();
        let metadata_bytes = metadata_sizes.iter().copied().sum();
        (
            Self {
                limits,
                nodes,
                metadata,
                metadata_sizes,
                depths,
                metadata_bytes,
            },
            root,
        )
    }

    /// Retorna a profundidade de um nó existente.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o identificador for inválido.
    fn depth_of(&self, id: NodeId) -> Result<usize, CalcAuyError> {
        self.depths
            .get(id.index())
            .copied()
            .ok_or_else(|| CalcAuyError::InvalidInput {
                message: format!("NodeId inválido: {}", id.get()),
            })
    }

    /// Verifica o orçamento de nós.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o limite for atingido.
    fn check_node_budget(&self) -> Result<(), CalcAuyError> {
        if self.nodes.len() >= self.limits.max_nodes {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxNodes,
                limit: as_u64(self.limits.max_nodes),
                actual: as_u64(self.nodes.len().saturating_add(1)),
            });
        }
        Ok(())
    }

    /// Verifica o orçamento de profundidade.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o limite for excedido.
    fn check_depth_budget(&self, depth: usize) -> Result<(), CalcAuyError> {
        if depth > self.limits.max_depth {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxDepth,
                limit: as_u64(self.limits.max_depth),
                actual: as_u64(depth),
            });
        }
        Ok(())
    }

    /// Verifica o orçamento de operandos de uma operação.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o limite for excedido.
    fn check_operand_budget(&self, count: usize) -> Result<(), CalcAuyError> {
        if count > self.limits.max_operands {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxOperands,
                limit: as_u64(self.limits.max_operands),
                actual: as_u64(count),
            });
        }
        Ok(())
    }

    /// Insere um nó já validado.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se qualquer limite for excedido.
    fn push(
        &mut self,
        data: NodeData,
        depth: usize,
        metadata: Metadata,
    ) -> Result<NodeId, CalcAuyError> {
        self.check_node_budget()?;
        self.check_depth_budget(depth)?;

        let bytes = metadata_size_bytes(&metadata);
        let total = self.metadata_bytes.saturating_add(bytes);
        if total > self.limits.max_metadata_bytes {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxMetadataBytes,
                limit: as_u64(self.limits.max_metadata_bytes),
                actual: as_u64(total),
            });
        }

        let index = self.nodes.len();
        self.nodes.push(data);
        self.metadata.push(Arc::new(metadata));
        self.metadata_sizes.push(bytes);
        self.depths.push(depth);
        self.metadata_bytes = total;
        NodeId::from_index(index).ok_or_else(|| CalcAuyError::LimitExceeded {
            kind: LimitKind::MaxNodes,
            limit: as_u64(self.limits.max_nodes),
            actual: as_u64(index),
        })
    }

    /// Adiciona um nó literal.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se um limite for excedido.
    pub fn literal(
        &mut self,
        value: Rational,
        original_input: impl Into<Box<str>>,
    ) -> Result<NodeId, CalcAuyError> {
        self.push(
            NodeData::Literal {
                value,
                original_input: original_input.into(),
            },
            1,
            Metadata::new(),
        )
    }

    /// Adiciona um nó de operação, validando operandos e profundidade.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se algum operando for inválido
    /// ou [`CalcAuyError::LimitExceeded`] se um limite for excedido.
    pub fn operation(
        &mut self,
        op: OperationType,
        operands: &[NodeId],
    ) -> Result<NodeId, CalcAuyError> {
        self.check_operand_budget(operands.len())?;

        let mut depth = 1_usize;
        for &id in operands {
            depth = depth.max(self.depth_of(id)?.saturating_add(1));
        }

        let mut inline = SmallVec::new();
        inline.extend(operands.iter().copied());
        self.push(
            NodeData::Operation {
                op,
                operands: inline,
            },
            depth,
            Metadata::new(),
        )
    }

    /// Adiciona um nó de agrupamento.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o filho for inválido ou
    /// [`CalcAuyError::LimitExceeded`] se um limite for excedido.
    pub fn group(&mut self, child: NodeId) -> Result<NodeId, CalcAuyError> {
        let depth = self.depth_of(child)?.saturating_add(1);
        self.push(NodeData::Group { child }, depth, Metadata::new())
    }

    /// Adiciona um nó de controle (custódia).
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o filho for inválido ou
    /// [`CalcAuyError::LimitExceeded`] se um limite for excedido.
    pub fn control(
        &mut self,
        child: NodeId,
        previous_context_label: impl Into<Box<str>>,
        previous_signature: impl Into<Box<str>>,
        previous_round_strategy: RoundingStrategy,
    ) -> Result<NodeId, CalcAuyError> {
        let depth = self.depth_of(child)?.saturating_add(1);
        self.push(
            NodeData::Control {
                child,
                previous_context_label: previous_context_label.into(),
                previous_signature: previous_signature.into(),
                previous_round_strategy,
            },
            depth,
            Metadata::new(),
        )
    }

    /// Adiciona uma operação associativa com *flattening* hierárquico.
    ///
    /// Cadeias com mais de `max_operands` termos são balanceadas em uma árvore
    /// de profundidade `O(log N)`. Operações não associativas são rejeitadas
    /// pelo caminho comum se excederem o limite.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se algum operando for inválido ou
    /// [`CalcAuyError::LimitExceeded`] se um limite for excedido.
    pub fn flattened_operation(
        &mut self,
        op: OperationType,
        operands: &[NodeId],
    ) -> Result<NodeId, CalcAuyError> {
        if !op.is_associative() || operands.len() <= self.limits.max_operands {
            return self.operation(op, operands);
        }

        let chunk = self.limits.max_operands.max(1);
        let mut level: Vec<NodeId> = Vec::with_capacity(operands.len().div_ceil(chunk));
        for group in operands.chunks(chunk) {
            level.push(self.operation(op, group)?);
        }
        self.flattened_operation(op, &level)
    }

    /// Substitui os metadados de um nó, verificando o limite de bytes.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o identificador for inválido
    /// ou [`CalcAuyError::LimitExceeded`] se o limite de bytes for excedido.
    pub fn set_metadata(&mut self, id: NodeId, metadata: Metadata) -> Result<(), CalcAuyError> {
        let index = id.index();
        let old_bytes =
            self.metadata_sizes
                .get(index)
                .copied()
                .ok_or_else(|| CalcAuyError::InvalidInput {
                    message: format!("NodeId inválido: {}", id.get()),
                })?;

        let new_bytes = metadata_size_bytes(&metadata);
        let total = self
            .metadata_bytes
            .saturating_sub(old_bytes)
            .saturating_add(new_bytes);
        if total > self.limits.max_metadata_bytes {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxMetadataBytes,
                limit: as_u64(self.limits.max_metadata_bytes),
                actual: as_u64(total),
            });
        }
        self.metadata_bytes = total;
        if let Some(size) = self.metadata_sizes.get_mut(index) {
            *size = new_bytes;
        }
        // Copy-on-write: só clona o mapa se o `Arc` estiver compartilhado.
        if let Some(slot) = self.metadata.get_mut(index) {
            *Arc::make_mut(slot) = metadata;
        }
        Ok(())
    }

    /// Insere uma chave de metadata em um nó.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o identificador for inválido
    /// ou [`CalcAuyError::LimitExceeded`] se o limite de bytes for excedido.
    pub fn insert_metadata(
        &mut self,
        id: NodeId,
        key: impl Into<Box<str>>,
        value: MetaValue,
    ) -> Result<(), CalcAuyError> {
        let index = id.index();
        let key: Box<str> = key.into();
        let old_bytes =
            self.metadata_sizes
                .get(index)
                .copied()
                .ok_or_else(|| CalcAuyError::InvalidInput {
                    message: format!("NodeId inválido: {}", id.get()),
                })?;
        let slot = self
            .metadata
            .get_mut(index)
            .ok_or_else(|| CalcAuyError::InvalidInput {
                message: format!("NodeId inválido: {}", id.get()),
            })?;

        // Atualização incremental: O(log n + |valor|) em vez de recomputar o
        // tamanho do mapa inteiro (que tornava N inserções O(N²)).
        let map = Arc::make_mut(slot);
        let entry_size = key.len().saturating_add(value.size_bytes());
        let replaced = map
            .get(key.as_ref())
            .map_or(0, |old| key.len().saturating_add(old.size_bytes()));
        let new_bytes = old_bytes
            .saturating_sub(replaced)
            .saturating_add(entry_size);
        let total = self
            .metadata_bytes
            .saturating_sub(old_bytes)
            .saturating_add(new_bytes);
        if total > self.limits.max_metadata_bytes {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxMetadataBytes,
                limit: as_u64(self.limits.max_metadata_bytes),
                actual: as_u64(total),
            });
        }
        map.insert(key, value);
        if let Some(size) = self.metadata_sizes.get_mut(index) {
            *size = new_bytes;
        }
        self.metadata_bytes = total;
        Ok(())
    }

    /// Finaliza a construção, validando a raiz.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se a raiz for inválida.
    pub fn finish(self, root: NodeId) -> Result<FlatAst, CalcAuyError> {
        if root.index() >= self.nodes.len() {
            return Err(CalcAuyError::InvalidInput {
                message: format!("raiz inválida: {}", root.get()),
            });
        }
        Ok(FlatAst::from_parts(
            self.nodes,
            self.metadata,
            self.depths,
            root,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::flat::NodeKind;

    #[test]
    fn builds_and_tracks_depth() {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let one = builder
            .literal(Rational::from_i64(1), "1")
            .expect("literal");
        let two = builder
            .literal(Rational::from_i64(2), "2")
            .expect("literal");
        let sum = builder
            .operation(OperationType::Add, &[one, two])
            .expect("soma");
        let ast = builder.finish(sum).expect("árvore");
        assert_eq!(ast.kind(sum), Some(NodeKind::Operation));
        assert_eq!(ast.depth(sum), Some(2));
    }

    #[test]
    fn rejects_invalid_operand() {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let ghost = NodeId::from_index(42).expect("id");
        assert!(builder.operation(OperationType::Add, &[ghost]).is_err());
    }

    #[test]
    fn rejects_too_many_operands() {
        let limits = Limits::new(1_000_000, 500, 10_000, 3, 16_384).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let a = builder.literal(Rational::ZERO, "0").expect("literal");
        let operands = [a, a, a, a];
        assert!(builder.operation(OperationType::Add, &operands).is_err());
    }

    #[test]
    fn rejects_node_limit() {
        let limits = Limits::new(1_000_000, 500, 2, 100, 16_384).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        assert!(builder.literal(Rational::ZERO, "0").is_ok());
        assert!(builder.literal(Rational::ZERO, "0").is_ok());
        assert!(builder.literal(Rational::ZERO, "0").is_err());
    }

    #[test]
    fn rejects_depth_limit() {
        let limits = Limits::new(1_000_000, 2, 100, 100, 16_384).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let leaf = builder.literal(Rational::ZERO, "0").expect("literal");
        let group = builder.group(leaf).expect("grupo");
        assert!(builder.group(group).is_err());
    }

    #[test]
    fn rejects_metadata_bytes_limit() {
        let limits = Limits::new(1_000_000, 500, 100, 100, 8).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let leaf = builder.literal(Rational::ZERO, "0").expect("literal");
        let big = "x".repeat(100);
        assert!(
            builder
                .insert_metadata(leaf, "k", MetaValue::Str(big))
                .is_err()
        );
    }

    #[test]
    fn metadata_bytes_track_replacements() {
        let limits = Limits::new(1_000_000, 500, 100, 100, 20).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let leaf = builder.literal(Rational::ZERO, "0").expect("literal");
        builder
            .insert_metadata(leaf, "k", MetaValue::Str("12345".into()))
            .expect("inserção");
        // Substituição por valor maior: 1 + 10 = 11 <= 20.
        builder
            .insert_metadata(leaf, "k", MetaValue::Str("1234567890".into()))
            .expect("substituição");
        // Substituição que excede: 1 + 30 = 31 > 20.
        assert!(
            builder
                .insert_metadata(leaf, "k", MetaValue::Str("x".repeat(30)))
                .is_err()
        );
        // A falha não corrompe a contabilidade: ainda cabe uma chave pequena.
        builder
            .insert_metadata(leaf, "k2", MetaValue::Str("abc".into()))
            .expect("inserção após falha");
    }

    #[test]
    fn flattening_keeps_logarithmic_depth() {
        let limits = Limits::new(1_000_000, 500, 1_000_000, 100, 16_384).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let mut operands = Vec::with_capacity(100_000);
        for _ in 0..100_000 {
            operands.push(builder.literal(Rational::ONE, "1").expect("literal"));
        }
        let root = builder
            .flattened_operation(OperationType::Add, &operands)
            .expect("flattening");
        let ast = builder.finish(root).expect("árvore");

        // 100_000 folhas + 1_000 + 10 + 1 nós internos.
        assert_eq!(ast.len(), 101_011);
        // log_100(100_000) ≈ 2.5 → profundidade 4 (raiz inclusive).
        assert!(ast.max_depth() <= 10, "profundidade = {}", ast.max_depth());
    }

    #[test]
    fn flattening_preserves_operand_order() {
        let limits = Limits::new(1_000_000, 500, 10_000, 2, 16_384).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let ids: Vec<_> = (0..5)
            .map(|value| {
                builder
                    .literal(Rational::from_i64(value), value.to_string())
                    .expect("literal")
            })
            .collect();
        let root = builder
            .flattened_operation(OperationType::Add, &ids)
            .expect("flattening");
        let ast = builder.finish(root).expect("árvore");
        assert_eq!(ast.len(), 11);
        assert!(ast.max_depth() <= 4);
    }

    #[test]
    fn rejects_off_by_one_operand_limit() {
        let limits = Limits::new(1_000_000, 500, 10_000, 2, 16_384).expect("limites");
        let mut builder = AstBuilder::new(&limits);
        let a = builder.literal(Rational::ZERO, "0").expect("literal");
        assert!(builder.operation(OperationType::Add, &[a, a]).is_ok());
        assert!(builder.operation(OperationType::Add, &[a, a, a]).is_err());
    }
}
