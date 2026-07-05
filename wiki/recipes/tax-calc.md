# Receitas: Cálculos Fiscais

## Substituição Tributária

### ST com MVA (Margem de Valor Agregado)

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

const Fiscal = CalcAUY.create({
    contextLabel: "substituicao-tributaria",
    salt: "fiscal-sefaz",
    roundStrategy: "NBR5891",
});

// BC_ST = (Preço + IPI) * (1 + MVA)
// ICMS_ST = BC_ST * Alíquota Interna - ICMS Próprio
const preco = 1_000;
const ipi = Fiscal.from(preco).mult("5%");
const mva = "40%";
const aliquotaInterna = "18%";
const aliquotaOrigem = "12%";

const bcSt = await Fiscal
    .from(preco)
    .add(ipi)
    .group()
    .mult(Fiscal.from(1).add(mva))
    .setMetadata("mva", "40% (Ajuste SN2026)")
    .commit();

const icmsProprio = await Fiscal.from(preco).mult(aliquotaOrigem).commit();
const icmsSt = await Fiscal
    .from(bcSt.toRawInternalNumber().n, bcSt.toRawInternalNumber().d)
    .mult(aliquotaInterna)
    .sub(icmsProprio)
    .setMetadata("tipo", "ICMS-ST")
    .commit();

console.log(`BC ST: ${bcSt.toMonetary()}`);       // R$ 1.470,00
console.log(`ICMS-ST: ${icmsSt.toMonetary()}`);    // R$ 88,20
```

## Alíquotas Progressivas

### IRPF Simulado com metadados por faixa

```typescript
const Irpf = CalcAUY.create({
    contextLabel: "irpf-2026",
    salt: "receita-federal",
    roundStrategy: "HALF_UP",
});

const rendaBruta = 8_000;

// Faixas simuladas com metadados de auditoria
const faixa1 = await Irpf
    .from(rendaBruta > 2_259 ? 2_259 : rendaBruta)
    .mult("0%") // isento
    .setMetadata("faixa", "Até R$ 2.259,00 — Isento")
    .commit();

const faixa2 = await Irpf
    .from(rendaBruta > 2_259 ? (rendaBruta > 2_826 ? 567 : rendaBruta - 2_259) : 0)
    .mult("7.5%")
    .setMetadata("faixa", "De R$ 2.259,01 até R$ 2.826,00 — 7,5%")
    .commit();

const faixa3 = await Irpf
    .from(rendaBruta > 2_826 ? (rendaBruta > 3_751 ? 925 : rendaBruta - 2_826) : 0)
    .mult("15%")
    .setMetadata("faixa", "De R$ 2.826,01 até R$ 3.751,00 — 15%")
    .commit();

const faixa4 = await Irpf
    .from(rendaBruta > 3_751 ? (rendaBruta > 4_664 ? 913 : rendaBruta - 3_751) : 0)
    .mult("22.5%")
    .setMetadata("faixa", "De R$ 3.751,01 até R$ 4.664,00 — 22,5%")
    .commit();

const faixa5 = await Irpf
    .from(rendaBruta > 4_664 ? rendaBruta - 4_664 : 0)
    .mult("27.5%")
    .setMetadata("faixa", "Acima de R$ 4.664,00 — 27,5%")
    .commit();

// Consolida imposto devido
const impostoDevido = await Irpf
    .from(faixa1)
    .add(faixa2)
    .add(faixa3)
    .add(faixa4)
    .add(faixa5)
    .commit();

console.log(`Imposto devido: ${impostoDevido.toMonetary()}`);
```

## DRE Simplificado

### Demonstração de Resultado com trilha de auditoria

```typescript
const Dre = CalcAUY.create({
    contextLabel: "dre-2026",
    salt: "contabilidade",
    roundStrategy: "TRUNCATE",
});

// Receita Bruta
const receita = await Dre
    .from(500_000)
    .setMetadata("conta", "Receita de Vendas")
    .setMetadata("periodo", "Jan/2026")
    .commit();

// Deduções
const impostosFV = await Dre.from(receita).mult("12%")
    .setMetadata("deducao", "Impostos s/ Vendas (PIS/COFINS/ICMS)")
    .commit();
const devolucoes = await Dre.from(15_000)
    .setMetadata("deducao", "Devoluções e Abatimentos")
    .commit();

// = Receita Líquida
const receitaLiquida = await Dre
    .from(receita.toRawInternalNumber().n, receita.toRawInternalNumber().d)
    .sub(impostosFV)
    .sub(devolucoes)
    .setMetadata("conta", "Receita Líquida")
    .commit();

// Custos
const custos = await Dre.from(200_000)
    .setMetadata("conta", "CPV / CMV")
    .commit();

// = Lucro Bruto
const lucroBruto = await Dre
    .from(receitaLiquida.toRawInternalNumber().n, receitaLiquida.toRawInternalNumber().d)
    .sub(custos)
    .setMetadata("conta", "Lucro Bruto")
    .commit();

// Despesas Operacionais
const despesas = await Dre.from(120_000)
    .setMetadata("conta", "Despesas Operacionais")
    .setMetadata("detalhes", ["Salários", "Aluguel", "Marketing"])
    .commit();

// = Resultado Líquido
const resultado = await Dre
    .from(lucroBruto.toRawInternalNumber().n, lucroBruto.toRawInternalNumber().d)
    .sub(despesas)
    .setMetadata("conta", "Resultado Líquido do Período")
    .commit();

console.log(`Receita Bruta:  ${receita.toMonetary()}`);       // R$ 500.000,00
console.log(`Receita Líquida: ${receitaLiquida.toMonetary()}`); // R$ 425.000,00
console.log(`Lucro Bruto:    ${lucroBruto.toMonetary()}`);     // R$ 225.000,00
console.log(`Resultado:      ${resultado.toMonetary()}`);       // R$ 105.000,00
console.log(`Rastro assinado: ${resultado.toAuditTrace()}`);

---

[↑ Voltar ao índice](../index.md)
```
