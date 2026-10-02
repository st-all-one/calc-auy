# WASM

`calc-auy-wasm` expõe `WasmCalc` como `cdylib`. No host usa `MockClock`; no
alvo WASM, o relógio vem de `js_sys::Date` e UUID v7. Erros são convertidos em
objetos `ProblemDetails` via `serde-wasm-bindgen`.

```js
import init, { WasmCalc } from "./calc_auy_wasm.js";

await init();
const calc = new WasmCalc("sal");
const committed = calc.parse("10000 * (1 + 14.75%) ^ 3");
console.log(calc.format(committed, 2));
```

O `rayon` não é usado no WASM (ADR-012); lotes são sequenciais por design.
