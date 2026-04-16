# Receitas de Cozinha: Casos de Uso Reais

Este guia apresenta padrões de implementação para problemas financeiros e fiscais comuns utilizando a CalcAUY.

## 1. Cálculo de Impostos (ICMS e IPI)
Cálculos fiscais no Brasil exigem o arredondamento **NBR-5891**.

```ts
const baseCalculo = CalcAUY.from("1250.45");
const aliquota = "0.18"; // 18%

const icms = baseCalculo
  .mult(aliquota)
  .setMetadata("tax_name", "ICMS")
  .commit({ roundStrategy: "NBR5891" });

console.log(icms.toMonetary({ locale: "pt-BR" })); // "R$ 225,08"
```

## 2. Divisão Exata de Centavos (Rateio)
Elimine a diferença de 1 centavo ao dividir valores entre sócios ou parcelas.

```ts
// Dividir R$ 10,00 entre 3 sócios
const total = CalcAUY.from(10).commit();

const parcelas = total.toSlice(3, { decimalPrecision: 2 });
console.log(parcelas); // ["3.34", "3.33", "3.33"]
// A soma é exatamente 10.00!
```

## 3. Folha de Pagamento (Massa de Dados)
Use o `ProcessBatchAUY` para processar milhares de salários sem travar o seu servidor.

```ts
const funcionarios = [/* 10.000 objetos */];

const folhaProcessada = await ProcessBatchAUY(funcionarios, (f) => {
  return CalcAUY.from(f.salarioBruto)
    .sub(f.descontoInss)
    .mult(1.05) // Bônus de 5%
    .setMetadata("func_id", f.id)
    .commit();
}, { 
  batchSize: 500,
  onProgress: (p) => console.log(`Processando folha: ${p}%`)
});
```

## 4. Juros Compostos com Auditoria
Gere um rastro visual para justificar o montante final ao cliente.

```ts
// M = P * (1 + i) ^ n
const principal = 5000;
const taxa = "0.02"; // 2% ao mês
const meses = 12;

const montante = CalcAUY.from(principal)
  .mult(
    CalcAUY.from(1).add(taxa).pow(meses)
  )
  .commit();

// Gere uma imagem ou LaTeX para o extrato do cliente
console.log(montante.toLaTeX());
```

---
**Dica de Performance:** Use o `CalcAUY.setLoggingPolicy({ sensitive: true })` em produção para garantir que valores reais não apareçam nos seus logs de infraestrutura, mantendo apenas a estrutura da conta para debug.
