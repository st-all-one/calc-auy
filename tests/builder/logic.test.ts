import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertThrows } from "@std/assert";
import { CalcAUY } from "@src/main.ts";
import { CalcAUYLogic } from "@src/builder.ts";
import { CalcAUYError } from "@src/core/errors.ts";

describe("Builder: Logic (Fluent API)", () => {
    const Finance = CalcAUY.create({
        contextLabel: "test-finance",
        salt: "test-salt",
        roundStrategy: "NBR5891",
    });

    it("deve iniciar um cálculo a partir de um valor literal", () => {
        const calc = Finance.from(100);
        assertEquals(calc instanceof CalcAUYLogic, true);
    });

    it("deve suportar diferentes tipos de entrada no .from()", async () => {
        // String decimal
        assertEquals((await Finance.from("10.5").commit()).toStringNumber(), "10.50");
        // String percentual
        assertEquals((await Finance.from("10%").commit()).toStringNumber(), "0.10");
        // String racional
        assertEquals((await Finance.from("1/4").commit()).toStringNumber(), "0.25");
        // Número puro
        assertEquals((await Finance.from(100).commit()).toStringNumber(), "100.00");
        // BigInt
        assertEquals((await Finance.from(100n).commit()).toStringNumber(), "100.00");
        // Outra instância do mesmo contexto
        const other = Finance.from(50);
        assertEquals((await Finance.from(other).commit()).toStringNumber(), "50.00");
    });

    it("deve suportar encadeamento imutável (Fluent API)", () => {
        const base = Finance.from(100);
        const next = base.add(50);

        // Imutabilidade: a instância original não deve ser alterada
        assertEquals(base !== next, true);
    });

    it("deve suportar todas as operações matemáticas básicas", async () => {
        const res = await Finance.from(10)
            .add(5) // 15
            .sub(2) // 13
            .mult(2) // 26
            .div(2) // 13
            .pow(2) // 169
            .mod(10) // 9
            .divInt(2) // 4 (9 // 2)
            .commit();

        // PEMDAS: 10 + 5 - 2 * 2 / 2 ^ 2 % 10 // 2
        // 2^2 = 4
        // 2*2 = 4; 4/4 = 1; 1%10 = 1; 1//2 = 0
        // 10 + 5 - 0 = 15
        assertEquals(res.toStringNumber(), "15.00");
    });

    it("deve permitir adicionar metadados em qualquer etapa e acumulá-los", async () => {
        const calc = Finance.from(100)
            .setMetadata("step", "initial")
            .add(50)
            .setMetadata("reason", "bonus")
            .setMetadata("step", "updated");

        const output = await calc.commit();
        const trace = output.toLiveTrace();

        // O nó raiz (última operação) deve ter os metadados
        assertEquals(trace.ast.metadata!.reason, "bonus");
        assertEquals(trace.ast.metadata!.step, "updated");
    });

    it("deve respeitar o agrupamento manual (.group()) para precedência", async () => {
        // Sem group: 10 + 5 * 2 = 20 (devido à precedência de operação no attachOp)
        // Nota: O builder.ts usa attachOp que pode ter sua própria lógica de precedência interna.
        // Vamos verificar se .group() força a precedência.

        // (10 + 5) * 2 = 30
        const calc1 = Finance.from(10).add(5).group().mult(2);
        const res1 = await calc1.commit();
        assertEquals(res1.toStringNumber(), "30.00");

        // 10 + (5 * 2) = 20
        const calc2 = Finance.from(10).add(Finance.from(5).mult(2).group());
        const res2 = await calc2.commit();
        assertEquals(res2.toStringNumber(), "20.00");
    });

    it("deve lançar erro ao tentar misturar instâncias de contextos diferentes", () => {
        const Sales = CalcAUY.create({ contextLabel: "sales", salt: "s1" });
        const Tax = CalcAUY.create({ contextLabel: "tax", salt: "s2" });

        const calcSales = Sales.from(100);
        // @ts-ignore: Testando mixagem de instâncias via branding
        assertThrows(() => Tax.from(calcSales), CalcAUYError, "Attempted to mix instances from different contexts");

        const calcTax = Tax.from(50);
        // @ts-ignore: Testando mixagem em operação
        assertThrows(() => calcSales.add(calcTax), CalcAUYError, "Attempted to mix instances from different contexts");
    });

    it("deve lançar erro ao chamar operação sem inicializar", () => {
        // @ts-ignore: Usando construtor interno para teste de segurança
        const invalid = new CalcAUYLogic(null, Symbol(), {} as any, null);
        assertThrows(() => invalid.add(10), CalcAUYError, "Calculation not initialized");
    });

    it("deve respeitar a precedência automática (PEMDAS) na construção fluente", async () => {
        // O builder por padrão anexa operações respeitando PEMDAS via attachOp.
        const res = await Finance.from(10).add(5).mult(2).commit();
        // 10 + (5 * 2) = 20
        assertEquals(res.toStringNumber(), "20.00");
    });

    it("deve suportar operações com instâncias do mesmo contexto", async () => {
        const a = Finance.from(10);
        const b = Finance.from(20);
        const res = await a.add(b).commit();
        assertEquals(res.toStringNumber(), "30.00");
    });

    it("deve permitir o uso de .from() para adotar o AST de outra instância se a atual for vazia", async () => {
        // Isso é testado indiretamente quando fazemos Finance.from(Finance.from(10))
        const inner = Finance.from(10).add(5);
        const outer = Finance.from(inner);
        const res = await outer.commit();
        assertEquals(res.toStringNumber(), "15.00");
    });

    it("deve validar tipos de metadados", () => {
        const calc = Finance.from(100);
        // @ts-ignore: Testando violação de tipo em tempo de execução
        assertThrows(() => calc.setMetadata("invalid", () => {}), CalcAUYError);
        // @ts-ignore: Testando violação de tipo em tempo de execução
        assertThrows(() => calc.setMetadata("invalid", Symbol()), CalcAUYError);
    });

    it("deve manter o isolamento de branding (TypeScript)", () => {
        // Este teste é mais para tipagem, mas valida o design
        const Sales = CalcAUY.create({ contextLabel: "sales", salt: "s1" });
        const res = Sales.from(100);
        // @ts-expect-error: Branding deve impedir atribuição
        const wrong: CalcAUYLogic<"tax"> = res;
    });
});
