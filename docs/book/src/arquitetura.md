# Arquitetura

O workspace é organizado em camadas, com dependências sempre apontando para o
núcleo:

```text
calc-auy-core      racional híbrido, AST em arena, integridade, engine, lotes
calc-auy-macros    #[derive(Canonical)]
calc-auy-parser    lexer + parser Pratt → FlatAst
calc-auy-builder   typestate Draft → Committed → Verified
calc-auy-output    decimal, monetário, LaTeX, Unicode, Mermaid, rateio
calc-auy-nlg       SRL + trait VerbalRealizer
calc-auy-i18n      realizers por idioma
calc-auy-processors Protobuf, CBOR, MessagePack (schema versionado)
calc-auy-api       fachada única
calc-auy-wasm      bindings WASM
calc-auy           binário CLI
```

## Fluxo

1. **Parse** → `FlatAst` (arena pós-ordem, limites como invariantes).
2. **Commit** → verificação de custódia, avaliação, arredondamento e assinatura.
3. **Verify** → `VerifiedAst`, pré-requisito de `eval`.
4. **Output** → todos os formatos derivam de um `Committed` selado.

A assinatura é `BLAKE3(canonical ‖ salt)`; o *wire* é `snake_case` com
`trace_version`. Metadados entram no `trace_hash`, mas não no `value_hash`
(chave de memoização).
