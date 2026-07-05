# CalcAUY — Agent Guide

## TL;DR

```bash
deno task fmt          # format (4-space indent, sameLine braces, lineWidth 120)
deno task lint         # lint (strict rules: explicit return types, no-non-null-assertion, verbatim-module-syntax, etc.)
deno task test         # all tests (BDD via @std/testing/bdd)
deno task test:stress  # stress suite only
deno task coverage     # test + coverage; output via `deno coverage ./coverage`
```

Publish: `npx jsr publish` (CI auto-publishes on push to `main`).

## Architecture

- **AST-based arithmetic**: build an immutable tree via fluent API → collapse at `.commit()`
- **Instance isolation**: `CalcAUY.create({ contextLabel, salt?, roundStrategy?, encoder? })` — **no global state**
- **Rational math**: `BigInt` fractions `n/d`, GCD-simplified every operation, 1M-bit safety ceiling (`math-overflow` error)
- **Integrity signing**: BLAKE3 signature via `@std/crypto`, salted. `checkIntegrity` / `hydrate` validate bit-by-bit
- **Error format**: RFC 7807 (`CalcAUYError` with `type`, `title`, `status`, `detail`, `instance`, `context`)
- **Tech stack**: Deno runtime, `@std/crypto` (BLAKE3), LogTape 2.0 (logging), `@std/uuid` (v7 UUID for error tracking), BigInt native
- **Cache strategy**: Hot (Map, 512 entries, strong refs) → Cold (WeakRef + FinalizationRegistry, auto-GC'd)
- **Persistence**: `.hibernate()` serializes mid-calculation AST with signature; `.hydrate()` validates signature and reconstructs

## Entry points

| Path | What |
|------|------|
| `mod.ts` | Public API exports |
| `src/main.ts` | `CalcAUY` factory (`create`, `checkIntegrity`, `createCacheSession`) |
| `src/builder.ts` | `CalcAUYLogic` — fluent builder (`.from()`, `.add()`, `.mult()`, `.group()`, `.setMetadata()`, `.hibernate()`, `.commit()`) |
| `src/output.ts` | `CalcAUYOutput` — multi-format result |
| `src/core/rational.ts` | `RationalNumber` — core math engine |
| `src/ast/engine.ts` | AST evaluator |
| `src/core/rounding.ts` | Rounding strategies |

Import-map aliases used in tests: `@src/`, `@calcauy`, `@processor/`, `@tools/`.

## Testing

- BDD via `@std/testing/bdd` (`describe`/`it`), assertions via `@std/assert`
- **Test descriptions in Portuguese**
- Import helpers via `@src/`, `@calcauy`, `@processor/` aliases
- `CalcAUY.create({...})` for instances. Some legacy tests use `CalcAUY.from()` — do not follow that pattern for new code.
- Deterministic timestamps: pass `[BIRTH_TICKET_MOCK]` (symbol from `src/core/constants.ts`) as string in config.

## Code conventions

- Strict TS: `strict`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`
- `#private` fields for encapsulation
- Explicit return types on all functions/methods (`explicit-function-return-type`, `explicit-module-boundary-types`)
- `verbatim-module-syntax` enabled — use `import type` for type-only imports
- 4-space indent, `sameLine` braces, `nextLine` operators, `lineWidth` 120, no tab

## Key config

- Deno 2.7+, uses `deno.jsonc` at root (not `deno.json`)
- `vendor: true`, `nodeModulesDir: "auto"`
- Lockfile: `deno.lock` (not frozen)
- Workspace: `./demo`, `./tests`, `./mini-scripts`
- JSR package name: `@st-all-one/calc-auy`

## Important constraints

| Constraint | Detail |
|------------|--------|
| Rounding defaults | `NBR5891`, other options: `HALF_UP`, `HALF_EVEN`, `TRUNCATE`, `CEILING`, `FLOOR` |
| Output locales | `pt-BR`, `en-US`, `en-EU`, `es-ES`, `fr-FR`, `de-DE`, `ru-RU`, `zh-CN`, `ja-JP` |
| BigInt limit | 1M bits max; throws `math-overflow` |
| Encoders | `"hex"` (default) or `"base64"` |

## Directory map

```
src/           — core library
  ast/         — AST types, engine, builder utils
  core/        — RationalNumber, rounding, constants, errors, metadata
  parser/      — Lexer + Parser (string expressions)
  utils/       — logger, sanitizer, security (BLAKE3 signing)
  output_internal/ — renderers, i18n, unicode, slicer, mermaid
processor/     — custom output processors (protobuf, cbor, html, msgpack, image-buffer, persistence)
schema/        — audit trace schema definitions (JSON, CDDL, Proto, SQL, Prisma, GraphQL, Kysely, OpenAPI)
tests/         — BDD tests by domain (builder, core, audit, security, output, stress, repro, performance)
wiki/          — detailed docs (internal architecture, rounding spec, security deep-dive)
demo/          — interactive web demo (Deno server)
```
