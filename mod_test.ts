import { assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { CurrencyNBR } from "./mod.ts";

// --- 1. TESTES DE FUNCIONALIDADE CORE ---

Deno.test("CurrencyNBR - Criação e Parse", () => {
    assertEquals(CurrencyNBR.from("123.45").commit(6).toString(), "123.450000");
    assertEquals(CurrencyNBR.from(123).commit(6).toString(), "123.000000");

    const amount = CurrencyNBR.from("0.1234567890125");
    const expectedInternalValue = 123456789013n;
    // @ts-ignore - Acessando propriedade privada para validação de integridade
    assertEquals((amount as any).activeTermValue, expectedInternalValue);
});

Deno.test("CurrencyNBR - Operações Básicas e Precedência", () => {
    const calculation = CurrencyNBR.from(10).add(5).mult(2);
    assertEquals(calculation.commit(2).toString(), "20.00");
    assertEquals(calculation.commit(2).toLaTeX(), "$$ 10 + 5 \\times 2 = 20.00 $$");

    const groupedCalculation = CurrencyNBR.from(10).add(5).group().mult(2);
    assertEquals(groupedCalculation.commit(2).toString(), "30.00");
    assertEquals(
        groupedCalculation.commit(2).toLaTeX(),
        "$$ \\left( 10 + 5 \\right) \\times 2 = 30.00 $$",
    );

    const divisionSubtraction = CurrencyNBR.from(100).div(4).sub(5);
    assertEquals(divisionSubtraction.commit(2).toString(), "20.00");
    assertEquals(divisionSubtraction.commit(2).toLaTeX(), "$$ \\frac{100}{4} - 5 = 20.00 $$");
});

Deno.test("CurrencyNBR - Exponenciação", () => {
    const power = CurrencyNBR.from(3).pow(2);
    assertEquals(power.commit(2).toString(), "9.00");
    assertEquals(power.commit(2).toLaTeX(), "$$ {3}^{2} = 9.00 $$");

    const squareRoot = CurrencyNBR.from(81).pow("1/2");
    assertEquals(squareRoot.commit(2).toString(), "9.00");

    const cubicRootPower = CurrencyNBR.from(8).pow("2/3");
    assertEquals(cubicRootPower.commit(2).toString(), "4.00");
    assertEquals(cubicRootPower.commit(2).toLaTeX(), "$$ \\sqrt[3]{8^{2}} = 4.00 $$");
});

Deno.test("CurrencyNBR - Arredondamento ABNT NBR 5891", () => {
    assertEquals(CurrencyNBR.from("1.225").commit(2).toString(), "1.22"); // Par
    assertEquals(CurrencyNBR.from("1.235").commit(2).toString(), "1.24"); // Ímpar
    assertEquals(CurrencyNBR.from("1.225000000001").commit(2).toString(), "1.23"); // 5 seguido de não-zero
});

Deno.test("CurrencyNBR - Expressão Complexa", () => {
    // sqrt((100 * 1.05) + (200 / 2))
    const term1 = CurrencyNBR.from(100).mult("1.05");
    const term2 = CurrencyNBR.from(200).div(2);
    const finalResult = term1.add(term2).group().pow("1/2");

    assertEquals(finalResult.commit(4).toString(), "14.3178");
    assertEquals(
        finalResult.commit(4).toLaTeX(),
        "$$ \\sqrt[2]{\\left( 100 \\times 1.05 + \\frac{200}{2} \\right)} = 14.3178 $$",
    );
});

// --- 2. TESTES DE ACESSIBILIDADE (WCAG AAA) ---

Deno.test("Accessibility (WCAG AAA) - Narração Verbal Básica", () => {
    const simple = CurrencyNBR.from(10).add(5).sub(2);
    assertEquals(simple.commit(2).toVerbalA11y(), "10 mais 5 menos 2 é igual a 13 vírgula 00");

    const multDiv = CurrencyNBR.from(100).mult(2).div(10);
    assertEquals(
        multDiv.commit(0).toVerbalA11y(),
        "100 multiplicado por 2 dividido por 10 é igual a 20",
    );
});

Deno.test("Accessibility (WCAG AAA) - Narração de Grupos e Precedência", () => {
    const grouped = CurrencyNBR.from(10).add(5).group().mult(2);
    assertEquals(
        grouped.commit(2).toVerbalA11y(),
        "em grupo, 10 mais 5, fim do grupo multiplicado por 2 é igual a 30 vírgula 00",
    );
});

Deno.test("Accessibility (WCAG AAA) - Narração de Raízes e Potências", () => {
    const root = CurrencyNBR.from(8).pow("1/3");
    assertEquals(root.commit(0).toVerbalA11y(), "raiz de índice 3 de 8 é igual a 2");

    const complexPow = CurrencyNBR.from(8).pow("2/3");
    assertEquals(complexPow.commit(0).toVerbalA11y(), "raiz de índice 3 de 8 elevado a 2 é igual a 4");
});

Deno.test("Accessibility (WCAG AAA) - Cenário Financeiro Real", () => {
    const juros = CurrencyNBR.from(1000).mult(CurrencyNBR.from(1).add("0.05").group());
    const expected = "1000 multiplicado por em grupo, 1 mais 0,05, fim do grupo é igual a 1050 vírgula 00";
    assertEquals(juros.commit(2).toVerbalA11y(), expected);
});

// --- 3. TESTES DE ESTRESSE E CASOS EXTREMOS ---

Deno.test("Stress & Edge Cases - Entradas Inválidas (Cast Hacks)", () => {
    assertThrows(() => CurrencyNBR.from(null as any));
    assertThrows(() => CurrencyNBR.from(undefined as any));
    assertThrows(() => CurrencyNBR.from(""));
    assertThrows(() => CurrencyNBR.from("abc"));
    assertThrows(() => CurrencyNBR.from("1.2.3"));
    assertThrows(() => CurrencyNBR.from({} as any));
    assertThrows(() => CurrencyNBR.from(NaN));
    assertThrows(() => CurrencyNBR.from(Infinity));
});

Deno.test("Stress & Edge Cases - Valores Extremos", () => {
    const big = "999999999999999999999999999999";
    assertEquals(CurrencyNBR.from(big).commit(2).toString(), big + ".00");

    const smallArroundDown = CurrencyNBR.from("0.0000000000004");
    assertEquals(smallArroundDown.commit(12).toString(), "0.000000000000");

    const smallArroundUp = CurrencyNBR.from("0.0000000000005");
    assertEquals(smallArroundUp.commit(12).toString(), "0.000000000001");
});

Deno.test("Stress & Edge Cases - Operações de Longa Cadeia", () => {
    let calc = CurrencyNBR.from(0);
    for (let i = 0; i < 1000; i++) { calc = calc.add(1); }
    assertEquals(calc.commit(0).toString(), "1000");
    const latex = calc.commit(0).toLaTeX();
    assertEquals(latex.includes("1 + 1 + 1"), true);
});

Deno.test("Stress & Edge Cases - Alta Complexidade e Nesting", () => {
    let calc = CurrencyNBR.from(1);
    for (let i = 0; i < 50; i++) { calc = calc.add(1).group(); }
    assertEquals(calc.commit(0).toString(), "51");

    const op = CurrencyNBR.from(2).pow(10).div(1024).add(
        CurrencyNBR.from(100).pow("1/2").mult("0.1"),
    ).group().pow(2);
    assertEquals(op.commit(2).toString(), "4.00");
});

Deno.test("Stress & Edge Cases - Erros Matemáticos", () => {
    assertThrows(() => CurrencyNBR.from(10).div(0), Error, "Division by zero");
    assertThrows(
        () => CurrencyNBR.from(-1).pow("1/2"),
        Error,
        "Cannot calculate even root of a negative number.",
    );
    assertThrows(() => CurrencyNBR.from(10).pow("1/0"));
});

Deno.test("Stress & Edge Cases - Assincronismo e Concorrência", async () => {
    const values = Array.from({ length: 50 }, (_, i) => i);
    const results = await Promise.all(values.map(async (v) => {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        return CurrencyNBR.from(v).mult(2).commit(0).toString();
    }));
    results.forEach((res, i) => assertEquals(res, (i * 2).toString()));
});

// --- 4. TESTES COMPREENSIVOS (IMUTABILIDADE E LEIS) ---

Deno.test("Comprehensive - Verificação de Imutabilidade", () => {
    const original = CurrencyNBR.from(100);
    const d1 = original.add(50);
    const d2 = original.mult(2);
    const d3 = original.group();

    assertEquals(original.commit(2).toString(), "100.00");
    assertNotEquals(original, d1);
    assertNotEquals(original, d2);
    assertNotEquals(original, d3);
});

Deno.test("Comprehensive - Simulação Financeira (Juros Compostos)", () => {
    const principal = CurrencyNBR.from(1000);
    const taxa = CurrencyNBR.from(1).add(0.05).group();
    const montante = principal.mult(taxa.pow(12));

    assertEquals(montante.commit(2).toString(), "1795.86");
    const latex = montante.commit(2).toLaTeX();
    assertEquals(latex.includes("1000 \\times {\\left( 1 + 0.05 \\right)}^{12}"), true);
});

Deno.test("Comprehensive - Leis Matemáticas", () => {
    const a = CurrencyNBR.from("123.456789");
    const b = CurrencyNBR.from("987.654321");
    const c = CurrencyNBR.from("50.5");

    assertEquals(a.add(b).commit(6).toString(), b.add(a).commit(6).toString());
    assertEquals(a.mult(b).commit(6).toString(), b.mult(a).commit(6).toString());

    const res1 = a.mult(b.add(c).group()).commit(10).toString();
    const res2 = a.mult(b).add(a.mult(c)).commit(10).toString();
    assertEquals(res1, res2);
});

// --- 5. TESTES DE SAÍDA UNICODE (CLI) ---

Deno.test("Unicode Output - Operações Básicas", () => {
    const calc = CurrencyNBR.from(10).add(5).mult(2);
    assertEquals(calc.commit().toUnicode(), "10 + 5 × 2 = 20.000000");
});

Deno.test("Unicode Output - Exponenciação e Grupos", () => {
    const pow = CurrencyNBR.from(10).add(5).group().pow(2);
    assertEquals(pow.commit().toUnicode(), "(10 + 5)² = 225.000000");
});

Deno.test("Unicode Output - Raízes Complexas", () => {
    const root = CurrencyNBR.from(8).pow("1/3");
    // Agora validando com sobrescrito conforme correção
    assertEquals(root.commit().toUnicode(), "³√(8) = 2.000000");

    const squareRoot = CurrencyNBR.from(81).pow("1/2");
    assertEquals(squareRoot.commit().toUnicode(), "√(81) = 9.000000");
});

Deno.test("Unicode Output - Cadeia Longa", () => {
    const complex = CurrencyNBR.from(100).div(2).sub(10).group().mult(2);
    assertEquals(complex.commit(0).toUnicode(), "(100 ÷ 2 - 10) × 2 = 80");
});
