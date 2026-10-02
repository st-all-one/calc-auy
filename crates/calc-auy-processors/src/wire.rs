//! Modelo *wire* intermediário: projeção recursiva do payload assinado.
//!
//! É a fonte única para os quatro codecs (JSON, CBOR, MessagePack, Protobuf) e
//! permite impor [`Limits`] ao reconstruir a arena via [`AstBuilder`].

use calc_auy_core::{
    AstBuilder, CalcAuyError, FlatAst, Limits, MetaValue, Metadata, NodeData, NodeId,
    OperationType, Rational, RoundingStrategy, SignaturePayload, TraceVersion,
};
use serde::{Deserialize, Serialize};

/// Nó na forma recursiva do ADR-002 (`kind` primeiro).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum WireNode {
    /// Valor literal com entrada original.
    Literal {
        /// Valor racional exato.
        value: Rational,
        /// Texto original.
        original_input: String,
        /// Metadados de auditoria.
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
    /// Operação com operandos ordenados.
    Operation {
        /// Tipo da operação.
        op_type: OperationType,
        /// Operandos.
        operands: Vec<Self>,
        /// Metadados de auditoria.
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
    /// Agrupamento lógico.
    Group {
        /// Nó agrupado.
        child: Box<Self>,
        /// Metadados de auditoria.
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
    /// Nó de controle de custódia.
    Control {
        /// Nó agrupado.
        child: Box<Self>,
        /// Rótulo do contexto anterior.
        previous_context_label: String,
        /// Assinatura anterior.
        previous_signature: String,
        /// Estratégia de arredondamento anterior.
        previous_round_strategy: RoundingStrategy,
        /// Metadados de auditoria.
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
}

/// Payload assinado na forma *wire*.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WirePayload {
    /// Árvore de cálculo.
    pub ast: WireNode,
    /// Resultado final.
    pub final_result: Rational,
    /// Estratégia de arredondamento.
    pub round_strategy: RoundingStrategy,
    /// Versão do schema.
    pub trace_version: TraceVersion,
}

impl WirePayload {
    /// Projeta um [`SignaturePayload`] na forma *wire*.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se um `NodeId` for inválido.
    pub fn from_signature(payload: &SignaturePayload) -> Result<Self, CalcAuyError> {
        Ok(Self {
            ast: node_from_ast(&payload.ast, payload.ast.root())?,
            final_result: payload.final_result.clone(),
            round_strategy: payload.round_strategy,
            trace_version: payload.trace_version,
        })
    }

    /// Reconstrói um [`SignaturePayload`] impondo os limites fornecidos.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se um limite for excedido ou
    /// [`CalcAuyError::InvalidInput`] se a estrutura for inválida.
    pub fn to_signature(&self, limits: &Limits) -> Result<SignaturePayload, CalcAuyError> {
        let mut builder = AstBuilder::new(limits);
        let root = node_to_ast(&self.ast, &mut builder)?;
        let ast = builder.finish(root)?;
        Ok(SignaturePayload::new(
            ast,
            self.final_result.clone(),
            self.round_strategy,
            self.trace_version,
        ))
    }
}

/// Projeta um nó da arena na forma *wire* recursiva.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se um `NodeId` for inválido.
fn node_from_ast(ast: &FlatAst, id: NodeId) -> Result<WireNode, CalcAuyError> {
    let node = ast
        .node(id)
        .ok_or_else(|| invalid(format!("NodeId inválido: {}", id.get())))?;
    let metadata = ast.metadata(id).map(normalize_metadata).unwrap_or_default();
    match node {
        NodeData::Literal {
            value,
            original_input,
        } => Ok(WireNode::Literal {
            value: value.clone(),
            original_input: original_input.to_string(),
            metadata,
        }),
        NodeData::Operation { op, operands } => {
            let mut children = Vec::with_capacity(operands.len());
            for &child in operands {
                children.push(node_from_ast(ast, child)?);
            }
            Ok(WireNode::Operation {
                op_type: *op,
                operands: children,
                metadata,
            })
        }
        NodeData::Group { child } => Ok(WireNode::Group {
            child: Box::new(node_from_ast(ast, *child)?),
            metadata,
        }),
        NodeData::Control {
            child,
            previous_context_label,
            previous_signature,
            previous_round_strategy,
        } => Ok(WireNode::Control {
            child: Box::new(node_from_ast(ast, *child)?),
            previous_context_label: previous_context_label.to_string(),
            previous_signature: previous_signature.to_string(),
            previous_round_strategy: *previous_round_strategy,
            metadata,
        }),
    }
}

/// Reconstrói um nó na arena, aplicando limites via [`AstBuilder`].
///
/// # Errors
///
/// Retorna [`CalcAuyError::LimitExceeded`] se um limite for excedido.
fn node_to_ast(node: &WireNode, builder: &mut AstBuilder<'_>) -> Result<NodeId, CalcAuyError> {
    let (id, metadata) = match node {
        WireNode::Literal {
            value,
            original_input,
            metadata,
        } => (
            builder.literal(value.clone(), original_input.clone())?,
            metadata,
        ),
        WireNode::Operation {
            op_type,
            operands,
            metadata,
        } => {
            let mut ids = Vec::with_capacity(operands.len());
            for child in operands {
                ids.push(node_to_ast(child, builder)?);
            }
            (builder.operation(*op_type, &ids)?, metadata)
        }
        WireNode::Group { child, metadata } => {
            let child_id = node_to_ast(child, builder)?;
            (builder.group(child_id)?, metadata)
        }
        WireNode::Control {
            child,
            previous_context_label,
            previous_signature,
            previous_round_strategy,
            metadata,
        } => {
            let child_id = node_to_ast(child, builder)?;
            (
                builder.control(
                    child_id,
                    previous_context_label.clone(),
                    previous_signature.clone(),
                    *previous_round_strategy,
                )?,
                metadata,
            )
        }
    };
    if !metadata.is_empty() {
        builder.set_metadata(id, metadata.clone())?;
    }
    Ok(id)
}

/// Cria um erro de entrada inválida.
pub(crate) fn invalid(message: impl Into<String>) -> CalcAuyError {
    CalcAuyError::InvalidInput {
        message: message.into(),
    }
}

/// Normaliza a metadata para a forma canônica do *wire*.
///
/// Inteiros sem sinal que cabem em `i64` viram `Int`, espelhando a
/// normalização do formato JSON canônico (evita divergência entre codecs).
fn normalize_metadata(metadata: &Metadata) -> Metadata {
    metadata
        .iter()
        .map(|(key, value)| (key.clone(), normalize_meta(value)))
        .collect()
}

/// Normaliza um valor de metadata recursivamente.
fn normalize_meta(value: &MetaValue) -> MetaValue {
    match value {
        MetaValue::Uint(value) => {
            i64::try_from(*value).map_or(MetaValue::Uint(*value), MetaValue::Int)
        }
        MetaValue::Array(items) => MetaValue::Array(items.iter().map(normalize_meta).collect()),
        MetaValue::Object(map) => MetaValue::Object(
            map.iter()
                .map(|(key, value)| (key.clone(), normalize_meta(value)))
                .collect(),
        ),
        other => other.clone(),
    }
}
