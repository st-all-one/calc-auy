//! Codec Protobuf sobre o schema versionado (T11.2).

use std::collections::BTreeMap;

use calc_auy_core::{
    CalcAuyError, Limits, MetaValue, Metadata, OperationType, Rational, RoundingStrategy,
    TraceVersion,
};
use prost::Message;

use crate::generated;
use crate::wire::{WireNode, WirePayload, invalid};

/// Codifica um payload na forma Protobuf.
///
/// # Errors
///
/// Retorna [`CalcAuyError::SerializationError`] se a codificação falhar.
pub(crate) fn encode(payload: &WirePayload) -> Result<Vec<u8>, CalcAuyError> {
    let message = to_proto(payload)?;
    let mut buffer = Vec::with_capacity(message.encoded_len());
    message
        .encode(&mut buffer)
        .map_err(|error| CalcAuyError::SerializationError {
            message: error.to_string(),
        })?;
    Ok(buffer)
}

/// Decodifica um payload Protobuf na forma *wire*.
///
/// # Errors
///
/// Retorna [`CalcAuyError::SerializationError`] se a decodificação falhar ou
/// [`CalcAuyError::InvalidInput`] se a estrutura for inválida.
pub(crate) fn decode(bytes: &[u8]) -> Result<WirePayload, CalcAuyError> {
    let message =
        generated::Payload::decode(bytes).map_err(|error| CalcAuyError::SerializationError {
            message: error.to_string(),
        })?;
    from_proto(message)
}

/// Converte a forma *wire* para a mensagem Protobuf.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se um tipo de operação for
/// desconhecido.
fn to_proto(payload: &WirePayload) -> Result<generated::Payload, CalcAuyError> {
    Ok(generated::Payload {
        ast: Some(node_to_proto(&payload.ast)?),
        final_result: Some(rational_to_proto(&payload.final_result)),
        round_strategy: rounding_code(rounding_to_proto(payload.round_strategy)),
        trace_version: u32::from(payload.trace_version.get()),
    })
}

/// Converte a mensagem Protobuf para a forma *wire*.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se campos obrigatórios faltarem.
fn from_proto(payload: generated::Payload) -> Result<WirePayload, CalcAuyError> {
    let ast = required(payload.ast, "payload.ast")?;
    let final_result = required(payload.final_result, "payload.final_result")?;
    let version =
        u16::try_from(payload.trace_version).map_err(|_| invalid("trace_version fora de u16"))?;
    let trace_version = TraceVersion::new(version).ok_or_else(|| invalid("trace_version nulo"))?;
    Ok(WirePayload {
        ast: node_from_proto(ast)?,
        final_result: rational_from_proto(&final_result)?,
        round_strategy: rounding_from_proto(payload.round_strategy)?,
        trace_version,
    })
}

/// Converte um nó *wire* para Protobuf.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se um tipo de operação for
/// desconhecido.
fn node_to_proto(node: &WireNode) -> Result<generated::Node, CalcAuyError> {
    let (kind, metadata) = match node {
        WireNode::Literal {
            value,
            original_input,
            metadata,
        } => (
            generated::node::Kind::Literal(generated::Literal {
                value: Some(rational_to_proto(value)),
                original_input: original_input.clone(),
            }),
            metadata,
        ),
        WireNode::Operation {
            op_type,
            operands,
            metadata,
        } => {
            let mut children = Vec::with_capacity(operands.len());
            for child in operands {
                children.push(node_to_proto(child)?);
            }
            (
                generated::node::Kind::Operation(generated::Operation {
                    op: op_code(op_to_proto(*op_type)?),
                    operands: children,
                }),
                metadata,
            )
        }
        WireNode::Group { child, metadata } => (
            generated::node::Kind::Group(Box::new(generated::Group {
                child: Some(Box::new(node_to_proto(child)?)),
            })),
            metadata,
        ),
        WireNode::Control {
            child,
            previous_context_label,
            previous_signature,
            previous_round_strategy,
            metadata,
        } => (
            generated::node::Kind::Control(Box::new(generated::Control {
                child: Some(Box::new(node_to_proto(child)?)),
                previous_context_label: previous_context_label.clone(),
                previous_signature: previous_signature.clone(),
                previous_round_strategy: rounding_code(rounding_to_proto(*previous_round_strategy)),
            })),
            metadata,
        ),
    };
    Ok(generated::Node {
        kind: Some(kind),
        metadata: metadata_to_proto(metadata),
    })
}

/// Converte um nó Protobuf para a forma *wire*.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se campos obrigatórios faltarem.
fn node_from_proto(node: generated::Node) -> Result<WireNode, CalcAuyError> {
    let metadata = metadata_from_proto(node.metadata)?;
    match node.kind {
        Some(generated::node::Kind::Literal(literal)) => Ok(WireNode::Literal {
            value: rational_from_proto(&required(literal.value, "literal.value")?)?,
            original_input: literal.original_input,
            metadata,
        }),
        Some(generated::node::Kind::Operation(operation)) => {
            let op_type = op_from_proto(operation.op)?;
            let mut operands = Vec::with_capacity(operation.operands.len());
            for child in operation.operands {
                operands.push(node_from_proto(child)?);
            }
            Ok(WireNode::Operation {
                op_type,
                operands,
                metadata,
            })
        }
        Some(generated::node::Kind::Group(group)) => Ok(WireNode::Group {
            child: Box::new(node_from_proto(*required(group.child, "group.child")?)?),
            metadata,
        }),
        Some(generated::node::Kind::Control(control)) => Ok(WireNode::Control {
            child: Box::new(node_from_proto(*required(control.child, "control.child")?)?),
            previous_context_label: control.previous_context_label,
            previous_signature: control.previous_signature,
            previous_round_strategy: rounding_from_proto(control.previous_round_strategy)?,
            metadata,
        }),
        None => Err(invalid("nó sem `kind`")),
    }
}

/// Converte um racional para Protobuf.
fn rational_to_proto(value: &Rational) -> generated::Rational {
    generated::Rational {
        numerator: value.numerator(),
        denominator: value.denominator(),
    }
}

/// Converte um racional Protobuf para o domínio.
///
/// # Errors
///
/// Retorna [`CalcAuyError`] se o numerador/denominador forem inválidos.
fn rational_from_proto(value: &generated::Rational) -> Result<Rational, CalcAuyError> {
    let text = format!("{}/{}", value.numerator, value.denominator);
    calc_auy_core::numeric::parse::parse_rational(&text, &Limits::default())
}

/// Converte metadados para Protobuf (chaves ordenadas).
fn metadata_to_proto(metadata: &Metadata) -> Vec<generated::MetaEntry> {
    metadata
        .iter()
        .map(|(key, value)| generated::MetaEntry {
            key: key.to_string(),
            value: Some(meta_to_proto(value)),
        })
        .collect()
}

/// Converte metadados Protobuf para o domínio.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se uma entrada não tiver valor.
fn metadata_from_proto(entries: Vec<generated::MetaEntry>) -> Result<Metadata, CalcAuyError> {
    let mut metadata = Metadata::new();
    for entry in entries {
        let value = required(entry.value, "metadata.value")?;
        metadata.insert(entry.key.into_boxed_str(), meta_from_proto(value)?);
    }
    Ok(metadata)
}

/// Converte um valor de metadata para Protobuf.
fn meta_to_proto(value: &MetaValue) -> generated::MetaValue {
    let kind = match value {
        MetaValue::Null => generated::meta_value::Kind::Null(generated::Null {}),
        MetaValue::Bool(value) => generated::meta_value::Kind::BoolValue(*value),
        MetaValue::Int(value) => generated::meta_value::Kind::IntValue(*value),
        MetaValue::Uint(value) => generated::meta_value::Kind::UintValue(*value),
        MetaValue::Str(value) => generated::meta_value::Kind::StrValue(value.clone()),
        MetaValue::Array(items) => generated::meta_value::Kind::Array(generated::MetaArray {
            items: items.iter().map(meta_to_proto).collect(),
        }),
        MetaValue::Object(entries) => generated::meta_value::Kind::Object(generated::MetaObject {
            entries: entries
                .iter()
                .map(|(key, value)| generated::MetaEntry {
                    key: key.clone(),
                    value: Some(meta_to_proto(value)),
                })
                .collect(),
        }),
    };
    generated::MetaValue { kind: Some(kind) }
}

/// Converte um valor de metadata Protobuf para o domínio.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se o valor não tiver variante.
fn meta_from_proto(value: generated::MetaValue) -> Result<MetaValue, CalcAuyError> {
    match value.kind {
        Some(generated::meta_value::Kind::Null(_)) => Ok(MetaValue::Null),
        Some(generated::meta_value::Kind::BoolValue(value)) => Ok(MetaValue::Bool(value)),
        Some(generated::meta_value::Kind::IntValue(value)) => Ok(MetaValue::Int(value)),
        Some(generated::meta_value::Kind::UintValue(value)) => Ok(MetaValue::Uint(value)),
        Some(generated::meta_value::Kind::StrValue(value)) => Ok(MetaValue::Str(value)),
        Some(generated::meta_value::Kind::Array(array)) => {
            let mut items = Vec::with_capacity(array.items.len());
            for item in array.items {
                items.push(meta_from_proto(item)?);
            }
            Ok(MetaValue::Array(items))
        }
        Some(generated::meta_value::Kind::Object(object)) => {
            let mut entries = BTreeMap::new();
            for entry in object.entries {
                let value = required(entry.value, "meta_object.value")?;
                entries.insert(entry.key, meta_from_proto(value)?);
            }
            Ok(MetaValue::Object(entries))
        }
        None => Err(invalid("MetaValue sem `kind`")),
    }
}

/// Converte um tipo de operação para o enum Protobuf.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se o tipo for desconhecido.
fn op_to_proto(op: OperationType) -> Result<generated::OperationType, CalcAuyError> {
    Ok(match op {
        OperationType::Add => generated::OperationType::OperationAdd,
        OperationType::Sub => generated::OperationType::OperationSub,
        OperationType::Mul => generated::OperationType::OperationMul,
        OperationType::Div => generated::OperationType::OperationDiv,
        OperationType::Pow => generated::OperationType::OperationPow,
        OperationType::Mod => generated::OperationType::OperationMod,
        OperationType::DivInt => generated::OperationType::OperationDivInt,
        OperationType::CrossContextAdd => generated::OperationType::OperationCrossContextAdd,
        _ => return Err(invalid("tipo de operação desconhecido")),
    })
}

/// Converte o enum Protobuf para o tipo de operação.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se o valor for desconhecido.
fn op_from_proto(value: i32) -> Result<OperationType, CalcAuyError> {
    match generated::OperationType::try_from(value) {
        Ok(generated::OperationType::OperationAdd) => Ok(OperationType::Add),
        Ok(generated::OperationType::OperationSub) => Ok(OperationType::Sub),
        Ok(generated::OperationType::OperationMul) => Ok(OperationType::Mul),
        Ok(generated::OperationType::OperationDiv) => Ok(OperationType::Div),
        Ok(generated::OperationType::OperationPow) => Ok(OperationType::Pow),
        Ok(generated::OperationType::OperationMod) => Ok(OperationType::Mod),
        Ok(generated::OperationType::OperationDivInt) => Ok(OperationType::DivInt),
        Ok(generated::OperationType::OperationCrossContextAdd) => {
            Ok(OperationType::CrossContextAdd)
        }
        Ok(generated::OperationType::Unspecified) | Err(_) => {
            Err(invalid("tipo de operação desconhecido"))
        }
    }
}

/// Converte uma estratégia de arredondamento para o enum Protobuf.
const fn rounding_to_proto(rounding: RoundingStrategy) -> generated::RoundingStrategy {
    match rounding {
        RoundingStrategy::Nbr5891 => generated::RoundingStrategy::RoundingNbr5891,
        RoundingStrategy::HalfUp => generated::RoundingStrategy::RoundingHalfUp,
        RoundingStrategy::HalfEven => generated::RoundingStrategy::RoundingHalfEven,
        RoundingStrategy::Truncate => generated::RoundingStrategy::RoundingTruncate,
        RoundingStrategy::Ceil => generated::RoundingStrategy::RoundingCeil,
        RoundingStrategy::None => generated::RoundingStrategy::RoundingNone,
        _ => generated::RoundingStrategy::Unspecified,
    }
}

/// Converte o enum Protobuf para a estratégia de arredondamento.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se o valor for desconhecido.
fn rounding_from_proto(value: i32) -> Result<RoundingStrategy, CalcAuyError> {
    match generated::RoundingStrategy::try_from(value) {
        Ok(generated::RoundingStrategy::RoundingNbr5891) => Ok(RoundingStrategy::Nbr5891),
        Ok(generated::RoundingStrategy::RoundingHalfUp) => Ok(RoundingStrategy::HalfUp),
        Ok(generated::RoundingStrategy::RoundingHalfEven) => Ok(RoundingStrategy::HalfEven),
        Ok(generated::RoundingStrategy::RoundingTruncate) => Ok(RoundingStrategy::Truncate),
        Ok(generated::RoundingStrategy::RoundingCeil) => Ok(RoundingStrategy::Ceil),
        Ok(generated::RoundingStrategy::RoundingNone) => Ok(RoundingStrategy::None),
        Ok(generated::RoundingStrategy::Unspecified) | Err(_) => {
            Err(invalid("estratégia de arredondamento desconhecida"))
        }
    }
}

/// Extrai um campo obrigatório.
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se o campo estiver ausente.
fn required<T>(value: Option<T>, field: &str) -> Result<T, CalcAuyError> {
    value.ok_or_else(|| invalid(format!("campo obrigatório ausente: {field}")))
}

/// Converte um enum Protobuf de operação para o código `i32`.
#[allow(
    clippy::as_conversions,
    reason = "enums do prost são `#[repr(i32)]` e cabem em i32"
)]
const fn op_code(op: generated::OperationType) -> i32 {
    op as i32
}

/// Converte um enum Protobuf de arredondamento para o código `i32`.
#[allow(
    clippy::as_conversions,
    reason = "enums do prost são `#[repr(i32)]` e cabem em i32"
)]
const fn rounding_code(rounding: generated::RoundingStrategy) -> i32 {
    rounding as i32
}
