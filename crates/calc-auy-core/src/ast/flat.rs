//! Arena plana da AST (`FlatAst`) e seus nós.

use std::sync::Arc;

use smallvec::SmallVec;

use super::types::{Metadata, NodeId, OperationType};
use crate::numeric::{Rational, RoundingStrategy};

/// Dados de um nó armazenado na arena.
///
/// As operações guardam até 4 operandos *inline* via [`SmallVec`]; cadeias
/// maiores transbordam para o heap apenas quando necessário.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NodeData {
    /// Valor literal com a entrada original preservada para auditoria.
    Literal {
        /// Valor racional exato.
        value: Rational,
        /// Texto original informado pelo usuário.
        original_input: Box<str>,
    },
    /// Operação matemática com operandos indexados na arena.
    Operation {
        /// Tipo da operação.
        op: OperationType,
        /// Identificadores dos operandos.
        operands: SmallVec<[NodeId; 4]>,
    },
    /// Agrupamento lógico (parênteses).
    Group {
        /// Nó agrupado.
        child: NodeId,
    },
    /// Nó de controle para rastreabilidade de jurisdição.
    Control {
        /// Nó agrupado.
        child: NodeId,
        /// Rótulo do contexto anterior.
        previous_context_label: Box<str>,
        /// Assinatura anterior.
        previous_signature: Box<str>,
        /// Estratégia de arredondamento anterior.
        previous_round_strategy: RoundingStrategy,
    },
}

/// Categoria de um nó, sem os dados associados.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum NodeKind {
    /// Nó literal.
    Literal,
    /// Nó de operação.
    Operation,
    /// Nó de agrupamento.
    Group,
    /// Nó de controle.
    Control,
}

impl NodeKind {
    /// Retorna o nome estável em `snake_case`.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Literal => "literal",
            Self::Operation => "operation",
            Self::Group => "group",
            Self::Control => "control",
        }
    }
}

/// Partes desmontadas de uma [`FlatAst`]: nós, metadata, profundidades e raiz.
pub type AstParts = (Vec<NodeData>, Vec<Arc<Metadata>>, Vec<usize>, NodeId);

/// Árvore de arrays cache-friendly.
///
/// Os nós vivem contíguos em um [`Vec`]; as relações pai/filho usam índices
/// ([`NodeId`]) em vez de ponteiros. `Arc<FlatAst>` clona em O(1).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FlatAst {
    /// Nós contíguos.
    nodes: Vec<NodeData>,
    /// Metadados por nó (paralelo a `nodes`).
    metadata: Vec<Arc<Metadata>>,
    /// Profundidade de cada nó (paralelo a `nodes`).
    depths: Vec<usize>,
    /// Raiz da árvore.
    root: NodeId,
}

impl FlatAst {
    /// Constrói a arena a partir de suas partes (uso interno do *builder*).
    pub(crate) const fn from_parts(
        nodes: Vec<NodeData>,
        metadata: Vec<Arc<Metadata>>,
        depths: Vec<usize>,
        root: NodeId,
    ) -> Self {
        Self {
            nodes,
            metadata,
            depths,
            root,
        }
    }

    /// Retorna o identificador da raiz.
    #[must_use]
    pub const fn root(&self) -> NodeId {
        self.root
    }

    /// Retorna o número de nós da arena.
    #[must_use]
    pub const fn len(&self) -> usize {
        self.nodes.len()
    }

    /// Retorna `true` se a arena não tem nós.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Retorna `true` se o identificador existe na arena.
    #[must_use]
    pub fn contains(&self, id: NodeId) -> bool {
        id.index() < self.nodes.len()
    }

    /// Retorna os dados de um nó, se o identificador for válido.
    #[must_use]
    pub fn node(&self, id: NodeId) -> Option<&NodeData> {
        self.nodes.get(id.index())
    }

    /// Retorna a categoria de um nó.
    #[must_use]
    pub fn kind(&self, id: NodeId) -> Option<NodeKind> {
        self.node(id).map(|node| match node {
            NodeData::Literal { .. } => NodeKind::Literal,
            NodeData::Operation { .. } => NodeKind::Operation,
            NodeData::Group { .. } => NodeKind::Group,
            NodeData::Control { .. } => NodeKind::Control,
        })
    }

    /// Retorna o filho de um nó `Group`/`Control`.
    #[must_use]
    pub fn child(&self, id: NodeId) -> Option<NodeId> {
        match self.node(id)? {
            NodeData::Group { child } | NodeData::Control { child, .. } => Some(*child),
            NodeData::Literal { .. } | NodeData::Operation { .. } => None,
        }
    }

    /// Retorna os operandos de um nó `Operation`.
    #[must_use]
    pub fn operands(&self, id: NodeId) -> Option<&[NodeId]> {
        match self.node(id)? {
            NodeData::Operation { operands, .. } => Some(operands),
            NodeData::Literal { .. } | NodeData::Group { .. } | NodeData::Control { .. } => None,
        }
    }

    /// Retorna os metadados de um nó.
    #[must_use]
    pub fn metadata(&self, id: NodeId) -> Option<&Metadata> {
        self.metadata.get(id.index()).map(AsRef::as_ref)
    }

    /// Retorna a profundidade de um nó (raiz = 1).
    #[must_use]
    pub fn depth(&self, id: NodeId) -> Option<usize> {
        self.depths.get(id.index()).copied()
    }

    /// Retorna a profundidade máxima da árvore.
    #[must_use]
    pub fn max_depth(&self) -> usize {
        self.depths.iter().copied().max().unwrap_or(0)
    }

    /// Itera sobre todos os nós na ordem de construção.
    pub fn iter_nodes(&self) -> impl Iterator<Item = (NodeId, &NodeData)> {
        self.nodes
            .iter()
            .enumerate()
            .filter_map(|(index, data)| NodeId::from_index(index).map(|id| (id, data)))
    }

    /// Retorna `true` se o nó é uma folha (`Literal`).
    #[must_use]
    pub fn is_leaf(&self, id: NodeId) -> bool {
        matches!(self.node(id), Some(NodeData::Literal { .. }))
    }

    /// Decompõe a árvore em suas partes, permitindo reconstrução incremental.
    #[must_use]
    pub fn into_parts(self) -> AstParts {
        (self.nodes, self.metadata, self.depths, self.root)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::builder::AstBuilder;
    use crate::limits::Limits;

    fn build_sample() -> FlatAst {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let left = builder
            .literal(Rational::from_i64(1), "1")
            .expect("literal");
        let right = builder
            .literal(Rational::from_i64(2), "2")
            .expect("literal");
        let sum = builder
            .operation(OperationType::Add, &[left, right])
            .expect("operação");
        builder.finish(sum).expect("árvore válida")
    }

    #[test]
    fn accessors_traverse_arena() {
        let ast = build_sample();
        assert_eq!(ast.len(), 3);
        assert_eq!(ast.root().index(), 2);
        assert_eq!(ast.kind(ast.root()), Some(NodeKind::Operation));
        let operands = ast.operands(ast.root()).expect("operandos");
        assert_eq!(operands.len(), 2);
        assert!(ast.is_leaf(operands[0]));
        assert!(ast.is_leaf(operands[1]));
        assert_eq!(ast.child(ast.root()), None);
    }

    #[test]
    fn invalid_id_returns_none() {
        let ast = build_sample();
        let invalid = NodeId::from_index(999).expect("id válido");
        assert!(!ast.contains(invalid));
        assert!(ast.node(invalid).is_none());
        assert!(ast.kind(invalid).is_none());
    }

    #[test]
    fn max_depth_is_tracked() {
        let ast = build_sample();
        assert_eq!(ast.max_depth(), 2);
        assert_eq!(ast.depth(ast.root()), Some(2));
    }
}
