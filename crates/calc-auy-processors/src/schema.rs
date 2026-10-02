//! Schema canônico versionado: CDDL e JSON Schema (T11.1).
//!
//! O `.proto` (`schema/calc_auy.proto`) é a projeção binária; estes documentos
//! descrevem a forma *wire* canônica. `xtask schema` gera os arquivos a partir
//! destas constantes (fonte única) e o teste de sincronia evita divergência.

/// JSON Schema (draft 2020-12) da forma *wire*.
pub const JSON_SCHEMA: &str = r##"{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://calc-auy.dev/schema/calc_auy.schema.json",
  "title": "CalcAUY SignaturePayload (wire)",
  "type": "object",
  "required": ["ast", "final_result", "round_strategy", "trace_version"],
  "additionalProperties": false,
  "properties": {
    "ast": { "$ref": "#/$defs/Node" },
    "final_result": { "$ref": "#/$defs/Rational" },
    "round_strategy": { "$ref": "#/$defs/RoundingStrategy" },
    "trace_version": { "type": "integer", "minimum": 1 }
  },
  "$defs": {
    "Rational": {
      "type": "object",
      "required": ["n", "d"],
      "additionalProperties": false,
      "properties": {
        "n": { "type": "string" },
        "d": { "type": "string" }
      }
    },
    "OperationType": {
      "enum": ["add", "sub", "mul", "div", "pow", "mod", "div_int", "cross_context_add"]
    },
    "RoundingStrategy": {
      "enum": ["nbr5891", "half_up", "half_even", "truncate", "ceil", "none"]
    },
    "MetaValue": {
      "oneOf": [
        { "type": "null" },
        { "type": "boolean" },
        { "type": "integer" },
        { "type": "string" },
        { "type": "array", "items": { "$ref": "#/$defs/MetaValue" } },
        { "type": "object", "additionalProperties": { "$ref": "#/$defs/MetaValue" } }
      ]
    },
    "Metadata": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/MetaValue" }
    },
    "Node": {
      "oneOf": [
        {
          "type": "object",
          "required": ["kind", "value", "original_input"],
          "additionalProperties": false,
          "properties": {
            "kind": { "const": "literal" },
            "value": { "$ref": "#/$defs/Rational" },
            "original_input": { "type": "string" },
            "metadata": { "$ref": "#/$defs/Metadata" }
          }
        },
        {
          "type": "object",
          "required": ["kind", "op_type", "operands"],
          "additionalProperties": false,
          "properties": {
            "kind": { "const": "operation" },
            "op_type": { "$ref": "#/$defs/OperationType" },
            "operands": { "type": "array", "items": { "$ref": "#/$defs/Node" } },
            "metadata": { "$ref": "#/$defs/Metadata" }
          }
        },
        {
          "type": "object",
          "required": ["kind", "child"],
          "additionalProperties": false,
          "properties": {
            "kind": { "const": "group" },
            "child": { "$ref": "#/$defs/Node" },
            "metadata": { "$ref": "#/$defs/Metadata" }
          }
        },
        {
          "type": "object",
          "required": [
            "kind",
            "child",
            "previous_context_label",
            "previous_signature",
            "previous_round_strategy"
          ],
          "additionalProperties": false,
          "properties": {
            "kind": { "const": "control" },
            "child": { "$ref": "#/$defs/Node" },
            "previous_context_label": { "type": "string" },
            "previous_signature": { "type": "string" },
            "previous_round_strategy": { "$ref": "#/$defs/RoundingStrategy" },
            "metadata": { "$ref": "#/$defs/Metadata" }
          }
        }
      ]
    }
  }
}
"##;

/// CDDL da forma *wire*.
pub const CDDL: &str = r#"; Schema canônico do payload assinado (CalcAUY), versão 1.
; Campos são aditivos: nunca remova/renumere sem incrementar `trace_version`.

payload = {
  ast: node,
  final_result: rational,
  round_strategy: rounding-strategy,
  trace_version: uint .ge 1,
}

rational = { n: tstr, d: tstr }

operation-type =
    "add" / "sub" / "mul" / "div" / "pow" / "mod" / "div_int" / "cross_context_add"

rounding-strategy =
    "nbr5891" / "half_up" / "half_even" / "truncate" / "ceil" / "none"

meta-value = null / bool / int / tstr / [* meta-value] / { * tstr => meta-value }
metadata = { * tstr => meta-value }

node = literal / operation / group / control

literal = {
  kind: "literal",
  value: rational,
  original_input: tstr,
  ? metadata: metadata,
}

operation = {
  kind: "operation",
  op_type: operation-type,
  operands: [* node],
  ? metadata: metadata,
}

group = {
  kind: "group",
  child: node,
  ? metadata: metadata,
}

control = {
  kind: "control",
  child: node,
  previous_context_label: tstr,
  previous_signature: tstr,
  previous_round_strategy: rounding-strategy,
  ? metadata: metadata,
}
"#;

/// Retorna o JSON Schema canônico.
#[must_use]
pub const fn json_schema() -> &'static str {
    JSON_SCHEMA
}

/// Retorna o CDDL canônico.
#[must_use]
pub const fn cddl() -> &'static str {
    CDDL
}
