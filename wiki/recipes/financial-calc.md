# Receitas: Cálculos Financeiros

## Juros Compostos

### Montante com aporte único

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

const Finance = CalcAUY.create({
    contextLabel: "investimentos",
    salt: "financeiro-2026",
    roundStrategy: "HALF_EVEN",
});

// M = P * (1 + i)^n
const montante = await Finance
    .from(10_000) // principal
    .mult(
        Finance.from(1)
            .add("1.2%") // taxa mensal
            .group()
            .pow(12) // 12 meses
    )
    .commit();

console.log(montante.toMonetary()); // R$ 11.539,31
```

### Aporte mensal (série de pagamentos)

```typescript
// FV = PMT * [((1 + i)^n - 1) / i]
const taxa = Finance.from("1%");
const um = Finance.from(1);

const fv = await Finance
    .from(1_000) // PMT
    .mult(
        um.add(taxa).group().pow(12)
            .sub(1)
            .group()
            .div(taxa)
    )
    .commit();

console.log(fv.toMonetary()); // R$ 12.682,50
```

## Rateio de Impostos

### Distribuição proporcional entre produtos

```typescript
const Tributos = CalcAUY.create({
    contextLabel: "rateio-impostos",
    salt: "fiscal-2026",
});

const totalImposto = await Tributos.from(15_000).mult("5.5%").commit();

// Rateio por valor de cada produto
const split = totalImposto.toSliceByRatio(["40%", "35%", "25%"]);
console.log(split); // ["330.00", "288.75", "206.25"] → soma 825.00
```

### Rateio igual com ajuste de centavos (Largest Remainder)

```typescript
const despesa = await Tributos.from(10.00).commit();

const partes = despesa.toSlice(3);
console.log(partes); // ["3.34", "3.33", "3.33"] → soma exata 10.00
// O método distribui centavos residuais automaticamente
```

## Parcelamento

### Cálculo de parcela com juros (Price)

```typescript
// PMT = PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
const Price = CalcAUY.create({
    contextLabel: "parcelamento",
    salt: "credito",
    roundStrategy: "HALF_UP",
});

const i = Price.from("2%"); // taxa mensal
const n = 12;               // meses
const um = Price.from(1);

const pmt = await Price
    .from(5_000) // valor financiado
    .mult(
        i.mult(um.add(i).group().pow(n))
            .group()
            .div(um.add(i).group().pow(n).sub(1))
    )
    .commit();

console.log(pmt.toMonetary()); // R$ 472,79
```

### Simulação de parcelas com `toSlice()`

```typescript
const total = await Price.from(1_200).add("5%").commit();

// 12 parcelas iguais
const parcelas = total.toSlice(12);
console.log(parcelas);
// ["105.00", "105.00", ..., "105.00"] — centavos distribuídos

// Validação: soma deve bater o total
const soma = parcelas.reduce((a, b) => a + Number(b), 0);
console.log(soma.toFixed(2)); // "1260.00"

---

[↑ Voltar ao índice](../index.md)
```
