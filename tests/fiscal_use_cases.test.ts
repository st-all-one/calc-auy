import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../mod.ts";

describe("Cenários Fiscais (Integration)", () => {
    it("Juros Compostos Pro-Rata Die (Base 252 dias úteis)", () => {
        // PV = 1000, i = 10% a.a. (0.10), n = 1 dia
        // FV = PV * (1 + i)^(1/252)
        const pv = CurrencyNBR.from(1000);
        const taxaAnual = 0.10;
        const result = pv.mult(
            CurrencyNBR.from(1).add(taxaAnual).group().pow("1/252")
        ).commit(8);

        // (1 + 0.10)^(1/252) approx 1.000378...
        // 1000 * 1.000378 approx 1000.378...
        expect(result.toString()).toContain("1000.378");
    });

    it("Liquidação de Debênture (Principal + Juros - IRRF + Multa)", () => {
        const principal = CurrencyNBR.from(10000);
        const juros = CurrencyNBR.from(500);
        const irrfPercent = 0.15;
        const multa = CurrencyNBR.from(50);

        const lucro = juros;
        const irrf = lucro.mult(irrfPercent);

        const total = principal.add(juros).sub(irrf).add(multa).commit(2);

        // 10000 + 500 - (500 * 0.15) + 50 = 10500 - 75 + 50 = 10475
        expect(total.toString()).toBe("10475.00");
    });

    it("Tabela SAC (Soma das parcelas === Principal + Juros Total)", () => {
        const principalVal = 1200;
        const parcelasCount = 3;
        const taxaMensal = 0.01;

        const amortizacao = CurrencyNBR.from(principalVal).div(parcelasCount).group();

        let saldoDevedor = CurrencyNBR.from(principalVal);
        let totalPago = CurrencyNBR.from(0);

        for (let i = 0; i < parcelasCount; i++) {
            const juros = saldoDevedor.group().mult(taxaMensal);
            const prestacao = amortizacao.add(juros).commit(2);
            totalPago = totalPago.add(prestacao.toString());
            saldoDevedor = saldoDevedor.sub(amortizacao);
        }

        // P1: (400 + 12) = 412
        // P2: (400 + 8) = 408
        // P3: (400 + 4) = 404
        // Total: 1224
        expect(totalPago.commit(2).toString()).toBe("1224.00");
    });

    it("Tabela Price (Absorção de resíduo na última parcela)", () => {
        const principal = 1000;
        const n = 3;
        const i = 0.1; // 10% ao mês

        // PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
        // (1+i)^n = 1.1^3 = 1.331
        // PMT = 1000 * [0.1 * 1.331] / [1.331 - 1] = 1000 * 0.1331 / 0.331 approx 402.11
        const fator = CurrencyNBR.from(1).add(i).group().pow(n).group();
        const pmt = CurrencyNBR.from(principal)
            .mult(fator.mult(i).group())
            .div(fator.sub(1).group())
            .commit(2);

        expect(pmt.toString()).toBe("402.11");

        // Verificação de resíduo
        let saldo = CurrencyNBR.from(principal);
        for (let k = 0; k < n - 1; k++) {
            const juros = saldo.group().mult(i);
            const amortizacao = CurrencyNBR.from(pmt.toString()).sub(juros);
            saldo = saldo.sub(amortizacao);
        }

        // Última parcela deve cobrir o saldo remanescente + juros do último mês
        const jurosFinal = saldo.group().mult(i);
        const pmtFinal = saldo.group().add(jurosFinal).commit(2);

        // A soma deve dar o principal + juros totais, mas aqui apenas validamos que a última parcela existe e é próxima das outras
        expect(Number(pmtFinal.toString())).toBeGreaterThan(400);
        expect(Number(pmtFinal.toString())).toBeLessThan(405);
    });

    it("Rateio de Despesas (Divisão exata de 100,00 por 3 pessoas)", () => {
        const total = 100.00;
        const partes = 3;

        // 100 / 3 = 33.3333...
        // No rateio real, alguém paga o centavo extra.
        // Simulamos o rateio manual:
        const base = CurrencyNBR.from(total).div(partes).commit(2, { roundingMethod: "TRUNCATE" });
        const valorBase = Number(base.toString()); // 33.33

        const somaBase = valorBase * (partes - 1); // 66.66
        const ultimaParte = CurrencyNBR.from(total).sub(somaBase).commit(2); // 33.34

        expect(valorBase).toBe(33.33);
        expect(ultimaParte.toString()).toBe("33.34");
        expect(valorBase * 2 + 33.34).toBe(100.00);
    });
});
