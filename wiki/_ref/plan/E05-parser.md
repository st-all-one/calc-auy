# E05 — Parser

> **Depende de**: [E04](./E04-motor-avaliacao.md).
> **Entrega**: lexer zero-copy, parser de expressões → `FlatAst`.
> **Gate**: G5.

## Objetivo

Converter expressões textuais em AST de forma **zero-copy**, com precedência correta e sem panic,
alimentando o builder (E06).

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T05.1 | code | `Token<'a>` + `Lexer<'a>: Iterator<Item = Result<Token<'a>, _>>` sobre `&str` (sem alocar tokens) | T04 | Testes de tokenização; posições (byte/coluna) |
| T05.2 | code | Parser por descida recursiva → `FlatAst`: `+ - * / %`, `^` (associativa à direita), unário, parênteses, `%` percentual | T05.1 | Tabela de precedência do doc 04; testes de associatividade |
| T05.3 | code | Erros com posição e `ProblemDetails` (contexto do parser) | T05.2 | Mensagens com span; testes de erro |
| T05.4 | test | Facade de fuzz do parser (`cargo-fuzz`); differential de literais vs. referência exata | T05.2 | Sem panic; `evidence/E05/T05.4.txt` |
| T05.5 | bench | Lexer/parser por tamanho de entrada | T05.2 | `evidence/E05/T05.5.bench.json` |

---

## Notas

- **Zero-copy (doc 15 D2)**: tokens carregam `&str`; nenhum `String` por token.
- O parser emite direto na arena, reaproveitando o flattening (E02).

## Gate G5 — critérios

- [ ] Parser sem panic sob fuzzing, com posições.
- [ ] Precedência/associatividade corretas e testadas.
- [ ] Evidência: `plan/evidence/G5.md`.

## Rastreabilidade

- **ADRs**: 002 (AST), 015 (erros).
- **Docs**: 08, 15 (D2).
