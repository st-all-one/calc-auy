import { RationalNumber } from "../src/core/rational.ts";
import { CalcAUY } from "../src/builder.ts";

const ITERATIONS = 50000;
const inputs = ["150.00", "25.50", "1.18"];

// --- Teste 1: RationalNumber Puro (Simulando o cálculo do PDV) ---
const t1 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const a = RationalNumber.from(inputs[0]);
    const b = RationalNumber.from(inputs[1]);
    const c = RationalNumber.from(inputs[2]);
    a.add(b).mul(c);
}
const d1 = performance.now() - t1;

// --- Teste 2: CalcAUY Builder + Commit (Sem logs ativos no console) ---
const t2 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    CalcAUY.from(inputs[0])
        .add(inputs[1])
        .mult(inputs[2])
        .commit();
}
const d2 = performance.now() - t2;

console.log(`\n--- Benchmark de Isolamento (${ITERATIONS} iterações) ---`);
console.log(`1. RationalNumber (Puro): ${d1.toFixed(2)}ms`);
console.log(`2. CalcAUY (Fluxo Completo): ${d2.toFixed(2)}ms`);
console.log(`Overhead da Engine/Telemetria: ${(d2 / d1).toFixed(2)}x`);

if (d2 > d1 * 10) {
    console.warn("\nAVISO: Overhead massivo detectado na telemetria (> 10x).");
}
