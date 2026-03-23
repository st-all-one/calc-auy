import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { configure, type LogRecord, type Sink } from "@logtape";
import { CurrencyNBR } from "../mod.ts";
import { formatMonetary } from "../src/output_helpers/formatting.ts";
import { generateImageBuffer } from "../src/output_helpers/image_generator.ts";
import { roundCeil, roundHalfEven, roundHalfUp, roundTruncate } from "../src/output_helpers/rounding_strategies.ts";
import { toSuperscript } from "../src/internal/superscript.ts";
import { parseStringValue } from "../src/internal/parser.ts";
import { calculateBigIntPower, calculateNthRoot } from "../src/internal/math_utils.ts";
import { CurrencyNBRError } from "../src/errors.ts";

describe("Edge Cases e Robustez (logFatal)", () => {
    const records: LogRecord[] = [];
    const testSink: Sink = (record: LogRecord) => {
        records.push(record);
    };

    // Configuração do Logtape para capturar logs FATAL
    configure({
        sinks: { test: testSink },
        filters: {},
        loggers: [
            { category: ["currency-nbr-a11y"], sinks: ["test"], lowestLevel: "debug" },
        ],
    });

    it("deve disparar logFatal se ocorrer um erro inesperado em group()", () => {
        const val = CurrencyNBR.from(100);

        // Sabotagem via injeção de erro em propriedade privada
        Object.defineProperty(val, "activeTermValue", {
            get: () => { throw new Error("Erro Crítico Inesperado"); },
            configurable: true,
        });

        records.length = 0;
        try {
            val.group();
        } catch (e) {
            expect((e as any).message).toBe("Erro Crítico Inesperado");
        }

        const fatalLog = records.find(r => 
            r.level === "fatal" && 
            (r.properties as any).operation === "group"
        );

        expect(fatalLog).toBeDefined();
        expect((fatalLog?.properties as any).operation).toBe("group");
    });

    it("deve disparar logFatal se ocorrer um erro inesperado em add()", () => {
        const val = CurrencyNBR.from(100);

        // Sabotagem via injeção de erro em propriedade privada
        Object.defineProperty(val, "accumulatedValue", {
            get: () => { throw new Error("Unexpected Add Failure"); },
            configurable: true,
        });

        records.length = 0;
        try {
            val.add(50);
        } catch (e) {
            expect((e as any).message).toBe("Unexpected Add Failure");
        }

        const fatalLog = records.find(r => 
            r.level === "fatal" && 
            (r.properties as any).operation === "add"
        );

        expect(fatalLog).toBeDefined();
        expect((fatalLog?.properties as any).operation).toBe("add");
    });

    describe("formatMonetary (Internal)", () => {
        it("deve retornar a string original se parseFloat resultar em NaN", () => {
            const input = "invalid-numeric-content";
            const result = formatMonetary(input);
            expect(result).toBe(input);
        });

        it("deve usar precisão 0 se não houver ponto decimal na string (decimalPart é undefined)", () => {
            const input = "1000";
            const result = formatMonetary(input, "pt-BR", "BRL");
            // No Deno, o Intl para pt-BR formata 1000 como "R$ 1.000,00" por padrão se não forçada a precisão.
            // Nossa função força precision = 0 se não houver ponto.
            expect(result).toContain("1.000");
            expect(result).not.toContain(",00");
        });

        it("deve detectar e aplicar a precisão correta baseada no comprimento da decimalPart", () => {
            const input = "100.500"; // 3 casas decimais
            const result = formatMonetary(input, "pt-BR", "BRL");
            // Deve forçar a exibição de 3 casas (100,500)
            expect(result).toContain("100,500");
        });

        it("deve lidar com strings vazias retornando a própria string (NaN case)", () => {
            expect(formatMonetary("")).toBe("");
        });
    });

    describe("generateImageBuffer (Heurística de Layout)", () => {
        const decoder = new TextDecoder();

        it("deve aumentar a altura do SVG quando a expressão contém frações (\\frac)", () => {
            const bufferSimple = generateImageBuffer("10 + 10", "20", "dez mais dez");
            const bufferFrac = generateImageBuffer("\\frac{10}{2}", "5", "dez dividido por dois");

            const svgSimple = decoder.decode(bufferSimple);
            const svgFrac = decoder.decode(bufferFrac);

            const heightSimple = parseInt(svgSimple.match(/height="(\d+)"/)?.[1] || "0");
            const heightFrac = parseInt(svgFrac.match(/height="(\d+)"/)?.[1] || "0");

            expect(heightFrac).toBe(heightSimple + 40);
        });

        it("deve aumentar a altura do SVG quando a expressão contém raízes (\\sqrt)", () => {
            const bufferSimple = generateImageBuffer("9", "9", "nove");
            const bufferSqrt = generateImageBuffer("\\sqrt{9}", "3", "raiz quadrada de nove");

            const svgSimple = decoder.decode(bufferSimple);
            const svgSqrt = decoder.decode(bufferSqrt);

            const heightSimple = parseInt(svgSimple.match(/height="(\d+)"/)?.[1] || "0");
            const heightSqrt = parseInt(svgSqrt.match(/height="(\d+)"/)?.[1] || "0");

            expect(heightSqrt).toBe(heightSimple + 40);
        });
    });

    describe("Rounding Strategies (Internal Edge Cases)", () => {
        it("roundHalfUp - deve retornar o valor original se a escala alvo for maior ou igual", () => {
            const val = 12345n;
            expect(roundHalfUp(val, 2, 2)).toBe(val);
            expect(roundHalfUp(val, 2, 3)).toBe(val);
        });

        it("roundHalfEven - deve retornar o valor original se a escala alvo for maior ou igual", () => {
            const val = 12345n;
            expect(roundHalfEven(val, 2, 2)).toBe(val);
            expect(roundHalfEven(val, 2, 3)).toBe(val);
        });

        it("roundHalfEven - deve seguir comportamento Half-Up para casos não-meio (Positivos)", () => {
            // Divisor 10, Half 5. Resto 6 (> 5) -> Arredonda pra cima
            expect(roundHalfEven(16n, 1, 0)).toBe(2n);
            // Resto 4 (< 5) -> Mantém
            expect(roundHalfEven(14n, 1, 0)).toBe(1n);
        });

        it("roundHalfEven - deve seguir comportamento Half-Up para casos não-meio (Negativos)", () => {
            // Divisor 10, Half 5. Resto -6 (< -5) -> Arredonda pra baixo (magnitude aumenta)
            expect(roundHalfEven(-16n, 1, 0)).toBe(-2n);
            // Resto -4 (> -5) -> Mantém
            expect(roundHalfEven(-14n, 1, 0)).toBe(-1n);
        });

        it("roundTruncate - deve retornar o valor original se scaleDiff <= 0", () => {
            const val = 12345n;
            expect(roundTruncate(val, 2, 2)).toBe(val);
        });

        it("roundCeil - deve retornar o valor original se scaleDiff <= 0", () => {
            const val = 12345n;
            expect(roundCeil(val, 2, 2)).toBe(val);
        });
    });

    describe("Internal Utilities (Edge Cases)", () => {
        it("toSuperscript - deve retornar o próprio caractere se não houver mapeamento", () => {
            // 'a' e '?' não estão no mapa de sobrescritos
            expect(toSuperscript("a?1")).toBe("a?¹");
        });

        it("parseStringValue - deve normalizar strings com apenas vírgula como separador", () => {
            // Ramificação: } else if (normalized.includes(",")) {
            const result = parseStringValue("123,45");
            // 123.45 * 10^12 = 123450000000000
            expect(result.toString()).toBe("123450000000000");
        });

        it("parseStringValue - deve arredondar para cima se a 13ª casa decimal for >= 5", () => {
            // Nossa escala interna é 12. 
            // "0.0000000000005" (13 casas) -> 5 >= 5 -> deve virar 1 na 12ª casa
            const result = parseStringValue("0.0000000000005");
            expect(result).toBe(1n);

            const resultLower = parseStringValue("0.0000000000004");
            expect(resultLower).toBe(0n);
        });
    });

    describe("Math Utilities (Internal Edge Cases)", () => {
        it("calculateBigIntPower - deve lançar erro se o expoente for negativo", () => {
            try {
                calculateBigIntPower(10n, -1n);
                throw new Error("Não deveria chegar aqui");
            } catch (e) {
                expect(e).toBeInstanceOf(CurrencyNBRError);
                expect((e as any).type).toContain("negative-exponent");
            }
        });

        it("calculateNthRoot - deve lançar erro se o índice da raiz for <= 0", () => {
            try {
                calculateNthRoot(10n, 0n);
                throw new Error("Não deveria chegar aqui");
            } catch (e) {
                expect(e).toBeInstanceOf(CurrencyNBRError);
                expect((e as any).type).toContain("invalid-root-index");
            }
        });

        it("calculateNthRoot - deve retornar 0 se o valor for 0", () => {
            expect(calculateNthRoot(0n, 2n)).toBe(0n);
        });

        it("calculateNthRoot - deve realizar o ajuste fino corretamente (ramificação excesso)", () => {
            // Este teste visa garantir a maior raiz inteira que satisfaça r^n <= x
            // Usamos valores que forçam a lógica de busca do maior inteiro
            expect(calculateNthRoot(24n, 2n)).toBe(4n);
            expect(calculateNthRoot(8n, 2n)).toBe(2n);
        });

        it("calculateNthRoot - deve realizar o ajuste fino corretamente (ramificação falta)", () => {
            // Garante que se a estimativa for menor, o loop de incremento corrija
            expect(calculateNthRoot(15n, 2n)).toBe(3n);
            expect(calculateNthRoot(26n, 2n)).toBe(5n);
        });

        it("calculateNthRoot - deve lidar com raízes ímpares de números negativos e retornar sinal correto", () => {
            // Cobre: return isValueNegative ? -currentGuess : currentGuess;
            // Raiz cúbica de -27 = -3
            expect(calculateNthRoot(-27n, 3n)).toBe(-3n);
            // Raiz quinta de -32 = -2
            expect(calculateNthRoot(-32n, 5n)).toBe(-2n);
        });
    });

    describe("Engine Branching (Edge Cases)", () => {
        it("pow - deve gerar expressões corretas para potência fracionária com numerador diferente de 1", () => {
            // 8^(2/3) = raiz cúbica de (8^2) = raiz cúbica de 64 = 4
            const calc = CurrencyNBR.from(8).pow("2/3");
            const output = calc.commit(2);

            // 1. Validar LaTeX: deve conter a potência interna ^{2}
            const latex = output.toLaTeX();
            expect(latex).toContain("\\sqrt[3]{8^{2}}");

            // 2. Validar Verbal (PT-BR): deve conter "elevado a 2"
            const verbal = output.toVerbalA11y();
            expect(verbal).toContain("raiz de índice 3 de 8 elevado a 2");

            // 3. Validar Unicode: deve conter o sobrescrito ²
            const unicode = output.toUnicode();
            expect(unicode).toContain("³√(8²)");
            
            expect(output.toString()).toBe("4.00");
        });
    });
});

