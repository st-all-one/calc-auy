# CalcAUY — bindings WASM

Pacote JS (JSR/npm) do CalcAUY, gerado a partir de `calc-auy-wasm` com
`wasm-bindgen`. Números grandes e estruturas (AST, payload assinado) trafegam
como `string`/JSON; o núcleo é determinístico e não usa threads.

## Compilação

```sh
rustup target add wasm32-unknown-unknown
wasm-pack build crates/calc-auy-wasm --release --target bundler
# opcional: reduzir ainda mais o binário
wasm-opt -Oz crates/calc-auy-wasm/pkg/calc_auy_wasm_bg.wasm -o crates/calc-auy-wasm/pkg/calc_auy_wasm_bg.wasm
```

## Uso

```js
import init, { WasmCalc } from "@calc-auy/wasm";

await init();

// sal, casas decimais, estratégia de arredondamento, locale
const calc = new WasmCalc("meu-sal", 2, "nbr5891", "pt-BR");

// 1) Rascunho (AST canônica em JSON)
const draft = calc.parse("10000 * (1 + 14.75%) ^ 3");

// 2) Formatação (arredonda, assina e verifica)
calc.format(draft, 2);        // => "15109.78"
calc.monetary(draft);         // => "R$ 15.109,78"
calc.scaled(draft, 2);        // => "1510978"  (inteiro grande em string)
calc.json(draft);             // => JSON multi-formato + assinatura

// 3) Selagem + auditoria
const trace = calc.commit(draft);   // traço de auditoria assinado (JSON)
calc.signature(draft);              // assinatura hex (64 chars)
calc.verify(trace);                 // => true

// 4) Roundtrip: hibernar/reabrir
const reopened = calc.hydrate(draft);
calc.format(reopened, 2);           // => "15109.78"

// 5) Ingestão sem f64
calc.format(calc.from("2/3"), 2);   // => "0.67"

// 6) Cross-context: registre a assinatura do contexto anterior
calc.registerContext("contexto-anterior", "<assinatura-hex>");
```

## Erros

Todo erro vira um objeto [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807)
(`ProblemDetails`) com `type`, `title`, `status`, `detail` e `instance`:

```js
try {
  calc.parse("1 / 0");
} catch (problem) {
  console.error(problem.type, problem.detail); // division_by_zero, ...
}
```

## Relógio

`nowMillis()` e `nowRfc3339()` leem o tempo do host (`js_sys::Date`). Fora do
WASM (testes no host), o relógio é determinístico (`MockClock`).
