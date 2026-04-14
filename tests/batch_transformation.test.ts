import { CalcAUY } from "@calcauy";
import { CalcAUYOutput } from "@src/output.ts";
import { assertEquals } from "@std/assert";

Deno.test("Demonstração: Transformação de Massa vs. Consolidação com processBatch", async () => {
    const faturasBrutas = [
        { id: "INV-001", valor: "100.00", taxa: "0.05" },
        { id: "INV-002", valor: "200.00", taxa: "0.08" },
        { id: "INV-003", valor: "300.00", taxa: "0.10" },
    ];

    console.log("\n--- CENÁRIO 1: TRANSFORMAÇÃO DE MASSA (Retorno: Array) ---");
    /**
     * Objetivo: Processar cada fatura individualmente para obter o rastro de auditoria.
     * Útil para: Salvar no banco de dados cada item calculado separadamente.
     */
    const resultadosIndividuais = await CalcAUY.processBatch(faturasBrutas, (fatura) => {
        return CalcAUY.from(fatura.valor)
            .mult(CalcAUY.from(1).add(fatura.taxa))
            .setMetadata("invoice_id", fatura.id)
            .commit();
    }) as CalcAUYOutput[];

    // Validando que o retorno é um array com o mesmo tamanho da entrada
    assertEquals(resultadosIndividuais.length, 3);

    // O usuário pode acessar metadados e resultados de cada item individualmente
    console.log(
        `Fatura 1 calculada: ${resultadosIndividuais[0].toStringNumber()} (ID: ${
            JSON.parse(resultadosIndividuais[0].toAuditTrace()).ast.metadata.invoice_id
        })`,
    );
    assertEquals(resultadosIndividuais[0].toStringNumber(), "105.00");
    assertEquals(resultadosIndividuais[1].toStringNumber(), "216.00");
    assertEquals(resultadosIndividuais[2].toStringNumber(), "330.00");

    console.log("\n--- CENÁRIO 2: CONSOLIDAÇÃO (Retorno: Valor Único) ---");

    /**
     * Objetivo: Obter apenas o Valor Total Geral das faturas processadas.
     * Útil para: Relatórios de fechamento ou validação de totais.
     */
    const valorTotalGeral = await CalcAUY.processBatch(faturasBrutas, (fatura) => {
        // Cada tarefa retorna um objeto CalcAUY pronto para ser somado
        return CalcAUY.from(fatura.valor).mult(CalcAUY.from(1).add(fatura.taxa));
    }, {
        accumulator: CalcAUY.from(0),
        reducer: (acc: CalcAUY, item: CalcAUY) => acc.add(item),
    }) as CalcAUY;

    const totalFinal = valorTotalGeral.commit().toStringNumber();
    console.log(`Valor Total Consolidado: ${totalFinal}`);

    // Soma esperada: 105 + 216 + 330 = 651
    assertEquals(totalFinal, "651.00");
});
