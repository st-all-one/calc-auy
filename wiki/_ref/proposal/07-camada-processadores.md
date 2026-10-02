# 07 — Camada de Processadores

## Objetivo

Fornecer **serialização binária** e **transformações especializadas** do rastro de auditoria, permitindo:
- Persistência eficiente (Protobuf, CBOR, MessagePack)
- Renderização visual (HTML, SVG)
- Integração com bancos de dados

---

## Estrutura do Módulo

```
crates/calc-auy-processors/
├── src/
│   ├── lib.rs           # Re-exports
│   ├── protobuf.rs      # Protobuf v3
│   ├── cbor.rs          # CBOR (RFC 8949)
│   ├── msgpack.rs      # MessagePack
│   ├── html.rs          # HTML com KaTeX
│   ├── image.rs         # SVG buffer
│   └── persistence.rs   # Mapeamento para banco
```

---

## Processador Protobuf

```rust
// crates/calc-auy-processors/src/protobuf.rs

use prost::Message;
use calc_auy_core::ast::{Ast, Node, OperationType, RationalValue};

/// Schema Protobuf gerado.
///
/// ```proto
/// syntax = "proto3";
/// package calc_auy;
///
/// enum OperationType {
///   OPERATION_TYPE_UNSPECIFIED = 0;
///   OPERATION_TYPE_ADD = 1;
///   OPERATION_TYPE_SUB = 2;
///   OPERATION_TYPE_MULT = 3;
///   OPERATION_TYPE_DIV = 4;
///   OPERATION_TYPE_POW = 5;
///   OPERATION_TYPE_MOD = 6;
///   OPERATION_TYPE_DIV_INT = 7;
///   OPERATION_TYPE_CROSS_CONTEXT_ADD = 8;
/// }
///
/// message RationalValue {
///   string n = 1;
///   string d = 2;
/// }
///
/// message CalculationNode {
///   map<string, MetadataValue> metadata = 1;
///   oneof node_type {
///     LiteralNode literal = 2;
///     OperationNode operation = 3;
///     GroupNode group = 4;
///     ControlNode control = 5;
///   }
/// }
///
/// message LiteralNode {
///   RationalValue value = 1;
///   string original_input = 2;
/// }
///
/// message OperationNode {
///   OperationType type = 1;
///   repeated CalculationNode operands = 2;
/// }
///
/// message GroupNode {
///   CalculationNode child = 1;
/// }
///
/// message ControlNode {
///   string previous_context_label = 1;
///   string previous_signature = 2;
///   string previous_round_strategy = 3;
///   CalculationNode child = 4;
/// }
///
/// message SerializedCalculation {
///   CalculationNode ast = 1;
///   string signature = 2;
///   string context_label = 3;
///   optional RationalValue final_result = 4;
///   optional string round_strategy = 5;
/// }
/// ```
pub mod proto {
    include!(concat!(env!("OUT_DIR"), "/calc_auy.rs"));
}

/// Serializa o rastro de auditoria para Protobuf.
pub fn to_protobuf(ast: &Ast) -> Result<Vec<u8>, CalcAuyError> {
    let proto_ast = convert_ast_to_proto(ast);
    let mut buffer = Vec::new();
    proto_ast.encode(&mut buffer)
        .map_err(|e| CalcAuyError::SerializationError(e.to_string()))?;
    Ok(buffer)
}

/// Deserializa um buffer Protobuf para AST.
pub fn from_protobuf(buffer: &[u8]) -> Result<Ast, CalcAuyError> {
    let proto_ast = proto::SerializedCalculation::decode(buffer)
        .map_err(|e| CalcAuyError::DeserializationError(e.to_string()))?;
    convert_proto_to_ast(&proto_ast)
}

fn convert_ast_to_proto(ast: &Ast) -> proto::SerializedCalculation {
    proto::SerializedCalculation {
        ast: Some(convert_node_to_proto(&ast.root)),
        signature: ast.signature.as_ref().map(|s| s.value.clone()).unwrap_or_default(),
        context_label: ast.context_label.clone(),
        final_result: ast.final_result.as_ref().map(|r| proto::RationalValue {
            n: r.n.clone(),
            d: r.d.clone(),
        }),
        round_strategy: ast.round_strategy.clone().unwrap_or_default(),
    }
}

fn convert_node_to_proto(node: &Node) -> proto::CalculationNode {
    let node_type = match node {
        Node::Literal { value, original_input, .. } => {
            proto::calculation_node::NodeType::Literal(proto::LiteralNode {
                value: Some(proto::RationalValue {
                    n: value.n.clone(),
                    d: value.d.clone(),
                }),
                original_input: original_input.clone(),
            })
        }
        Node::Operation { op_type, operands, .. } => {
            proto::calculation_node::NodeType::Operation(proto::OperationNode {
                r#type: convert_op_type(op_type) as i32,
                operands: operands.iter().map(convert_node_to_proto).collect(),
            })
        }
        Node::Group { child, .. } => {
            proto::calculation_node::NodeType::Group(proto::GroupNode {
                child: Some(Box::new(convert_node_to_proto(child))),
            })
        }
        Node::Control { child, previous_context_label, previous_signature, previous_round_strategy, .. } => {
            proto::calculation_node::NodeType::Control(proto::ControlNode {
                previous_context_label: previous_context_label.clone(),
                previous_signature: previous_signature.clone(),
                previous_round_strategy: previous_round_strategy.clone(),
                child: Some(Box::new(convert_node_to_proto(child))),
            })
        }
    };

    proto::CalculationNode {
        metadata: convert_metadata_to_proto(&node.metadata()),
        node_type: Some(node_type),
    }
}

fn convert_op_type(op: &OperationType) -> proto::OperationType {
    match op {
        OperationType::Add => proto::OperationType::Add,
        OperationType::Sub => proto::OperationType::Sub,
        OperationType::Mul => proto::OperationType::Mult,
        OperationType::Div => proto::OperationType::Div,
        OperationType::Pow => proto::OperationType::Pow,
        OperationType::Mod => proto::OperationType::Mod,
        OperationType::DivInt => proto::OperationType::DivInt,
        OperationType::CrossContextAdd => proto::OperationType::CrossContextAdd,
    }
}
```

---

## Processador CBOR

```rust
// crates/calc-auy-processors/src/cbor.rs

use ciborium::{de::from_reader, ser::into_writer};
use calc_auy_core::ast::Ast;

/// Serializa o rastro de auditoria para CBOR.
pub fn to_cbor(ast: &Ast) -> Result<Vec<u8>, CalcAuyError> {
    let mut buffer = Vec::new();
    into_writer(ast, &mut buffer)
        .map_err(|e| CalcAuyError::SerializationError(e.to_string()))?;
    Ok(buffer)
}

/// Deserializa um buffer CBOR para AST.
pub fn from_cbor(buffer: &[u8]) -> Result<Ast, CalcAuyError> {
    from_reader(buffer)
        .map_err(|e| CalcAuyError::DeserializationError(e.to_string()))
}
```

---

## Processador MessagePack

```rust
// crates/calc-auy-processors/src/msgpack.rs

use rmp_serde::{decode, encode};
use calc_auy_core::ast::Ast;

/// Serializa o rastro de auditoria para MessagePack.
pub fn to_msgpack(ast: &Ast) -> Result<Vec<u8>, CalcAuyError> {
    encode::to_vec(ast)
        .map_err(|e| CalcAuyError::SerializationError(e.to_string()))
}

/// Deserializa um buffer MessagePack para AST.
pub fn from_msgpack(buffer: &[u8]) -> Result<Ast, CalcAuyError> {
    decode::from_slice(buffer)
        .map_err(|e| CalcAuyError::DeserializationError(e.to_string()))
}
```

---

## Processador HTML

```rust
// crates/calc-auy-processors/src/html.rs

use calc_auy_output::CalcAuyOutput;

/// Gera fragmento HTML com renderização KaTeX.
///
/// O HTML gerado é auto-contido, incluindo CSS e fontes necessárias.
pub fn to_html(output: &CalcAuyOutput, options: Option<HtmlOptions>) -> String {
    let opts = options.unwrap_or_default();
    let latex = output.to_latex(None);
    let verbal = output.to_verbal_a11y(None);

    // Renderiza LaTeX para HTML (usando KaTeX ou similar)
    let rendered = render_katex(&latex, opts.katex_options());

    format!(
        r#"<div class="calc-auy-result" aria-label="{}">
  <style>
    {}
    .calc-auy-result {{ margin: 1em 0; overflow-x: auto; }}
  </style>
  {}
</div>"#,
        verbal,
        KATEX_CSS_MINIFIED,
        rendered
    )
}

pub struct HtmlOptions {
    pub display_mode: bool,
    pub throw_on_error: bool,
    pub container_class: Option<String>,
}

impl Default for HtmlOptions {
    fn default() -> Self {
        Self {
            display_mode: true,
            throw_on_error: false,
            container_class: None,
        }
    }
}

fn render_katex(latex: &str, options: &HtmlOptions) -> String {
    // Integração com KaTeX ou similar
    // Pode usar um crate Rust ou chamar um serviço externo
    todo!("Integrar com KaTeX")
}

const KATEX_CSS_MINIFIED: &str = include_str!("../vendor/katex.min.css");
```

---

## Processador de Imagem (SVG)

```rust
// crates/calc-auy-processors/src/image.rs

use calc_auy_output::CalcAuyOutput;

/// Gera buffer de imagem SVG da fórmula.
pub fn to_svg(output: &CalcAuyOutput) -> Vec<u8> {
    let latex = output.to_latex(None);
    let html = to_html(output, None);

    // Gera SVG a partir do HTML
    let svg = generate_svg(&html, &latex);

    svg.into_bytes()
}

fn generate_svg(html: &str, latex: &str) -> String {
    // Implementação de geração de SVG
    // Pode usar um crate como `resvg` ou `svg` para gerar o buffer
    todo!("Implementar geração de SVG")
}
```

---

## Processador de Persistência

```rust
// crates/calc-auy-processors/src/persistence.rs

use calc_auy_core::ast::Ast;

/// Registro para persistência em banco de dados.
#[derive(Debug, Clone)]
pub struct PersistenceRecord {
    pub signature: String,
    pub context_label: String,
    pub round_strategy: String,
    pub result_numerator: String,
    pub result_denominator: String,
    pub ast: Ast,
}

/// Converte o rastro de auditoria para registro de persistência.
pub fn to_persistence_record(ast: &Ast) -> Result<PersistenceRecord, CalcAuyError> {
    let final_result = ast.final_result.as_ref()
        .ok_or_else(|| CalcAuyError::MissingFinalResult)?;

    let round_strategy = ast.round_strategy.as_ref()
        .ok_or_else(|| CalcAuyError::MissingRoundStrategy)?;

    let signature = ast.signature.as_ref()
        .ok_or_else(|| CalcAuyError::MissingSignature)?;

    Ok(PersistenceRecord {
        signature: signature.value.clone(),
        context_label: ast.context_label.clone(),
        round_strategy: round_strategy.clone(),
        result_numerator: final_result.n.clone(),
        result_denominator: final_result.d.clone(),
        ast: ast.clone(),
    })
}

/// Converte registro de persistência de volta para AST.
pub fn from_persistence_record(record: &PersistenceRecord) -> Ast {
    Ast {
        root: record.ast.root.clone(),
        context_label: record.context_label.clone(),
        final_result: Some(RationalValue {
            n: record.result_numerator.clone(),
            d: record.result_denominator.clone(),
        }),
        round_strategy: Some(record.round_strategy.clone()),
        signature: Some(Signature {
            value: record.signature.clone(),
            encoder: SignatureEncoder::Hex,
        }),
    }
}
```

---

## Dependências

```toml
# crates/calc-auy-processors/Cargo.toml

[dependencies]
calc-auy-core = { path = "../calc-auy-core" }
calc-auy-output = { path = "../calc-auy-output" }

# Protobuf
prost = "0.12"
prost-types = "0.12"

# CBOR
ciborium = "0.2"

# MessagePack
rmp-serde = "1.1"

# Serde
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[build-dependencies]
prost-build = "0.12"
```

---

## Comparação de Tamanhos

| Formato | Tamanho (bytes) | Uso |
|---------|-----------------|-----|
| JSON | ~500-2000 | Debug, interoperabilidade |
| Protobuf | ~200-800 | Persistência, rede |
| CBOR | ~250-900 | Persistência, IoT |
| MessagePack | ~300-1000 | Persistência, rede |

*Valores estimados para um cálculo típico com 5-10 nós*

---

## Testes

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protobuf_roundtrip() {
        let ast = create_test_ast();
        let buffer = to_protobuf(&ast).unwrap();
        let recovered = from_protobuf(&buffer).unwrap();
        assert_eq!(ast, recovered);
    }

    #[test]
    fn test_cbor_roundtrip() {
        let ast = create_test_ast();
        let buffer = to_cbor(&ast).unwrap();
        let recovered = from_cbor(&buffer).unwrap();
        assert_eq!(ast, recovered);
    }

    #[test]
    fn test_msgpack_roundtrip() {
        let ast = create_test_ast();
        let buffer = to_msgpack(&ast).unwrap();
        let recovered = from_msgpack(&buffer).unwrap();
        assert_eq!(ast, recovered);
    }

    #[test]
    fn test_size_comparison() {
        let ast = create_test_ast();

        let json = serde_json::to_vec(&ast).unwrap();
        let protobuf = to_protobuf(&ast).unwrap();
        let cbor = to_cbor(&ast).unwrap();
        let msgpack = to_msgpack(&ast).unwrap();

        println!("JSON: {} bytes", json.len());
        println!("Protobuf: {} bytes", protobuf.len());
        println!("CBOR: {} bytes", cbor.len());
        println!("MessagePack: {} bytes", msgpack.len());

        // Protobuf deve ser menor que JSON
        assert!(protobuf.len() < json.len());
    }
}
```

---

## Conclusão

A camada de processadores em Rust oferece:
- **Performance**: Serialização binária 2-5x mais compacta que JSON
- **Interoperabilidade**: Formatos padronizados (Protobuf, CBOR, MessagePack)
- **Extensibilidade**: Fácil adicionar novos processadores
- **Type safety**: Schemas validados em tempo de compilação

A próxima seção detalha a camada de parser.
