# Guia Geral de Exemplos: `currency-math-audit`

Este documento é um guia exaustivo de cenários reais. Todos os exemplos abaixo utilizam a classe `CurrencyNBR` e demonstram a precisão de 12 casas decimais, o arredondamento NBR 5891, a auditoria visual LaTeX e a acessibilidade verbal WCAG AAA.

## Sumário
1. [Configuração Inicial](#0-configuração-inicial)
2. [Cenários Financeiros (Investimentos e Empréstimos)](#1-cenários-financeiros)
3. [Cenários Contábeis (Patrimônio e Estoque)](#2-cenários-contábeis)
4. [Cenários Fiscais (Impostos Brasileiros)](#3-cenários-fiscais)
5. [Matemática Pura e Algoritmos](#4-matemática-pura)
6. [Garantias de Precisão e Normas](#5-precisão-e-normas)

---

## 0. Configuração Inicial
Para rodar os exemplos, importe a classe principal:
```typescript
import { CurrencyNBR } from "./mod.ts";
```

---

## 1. Cenários Financeiros

### 1.1 Juros Compostos (Cálculo de Montante)
**Cenário:** Investimento de R$ 5.000,00 a 1,5% ao mês por 2 anos (24 meses).
```typescript
const principal = CurrencyNBR.from("5000");
const taxa = CurrencyNBR.from(1).add("0.015").group();
const montante = principal.mult(taxa.pow(24));

console.log(montante.commit(2));   // "7147.51"
console.log(montante.toLaTeX(2));  // $$ 5000 \times {\left( 1 + 0.015 \right)}^{24} = 7147.51 $$
console.log(montante.toVerbal(2)); // "5000 multiplicado por em grupo, 1 mais 0,015, fim do grupo elevado a 24 é igual a 7147 vírgula 51"
```

### 1.2 Valor Presente (Desconto Racional)
**Cenário:** Qual o valor hoje de R$ 10.000,00 que receberei daqui a 1 ano, com taxa de 1% a.m.?
```typescript
const vf = CurrencyNBR.from(10000);
const taxa = CurrencyNBR.from(1).add("0.01").group();
const vp = vf.div(taxa.pow(12));

console.log(vp.commit(2));   // "8874.49"
console.log(vp.toVerbal(2)); // "10000 dividido por em grupo, 1 mais 0,01, fim do grupo elevado a 12 é igual a 8874 vírgula 49"
```

### 1.3 Amortização SAC (Primeira Parcela)
**Cenário:** Financiamento de R$ 200.000,00 em 100 meses a 0,8% a.m.
```typescript
const saldo = CurrencyNBR.from(200000);
const juros = saldo.mult("0.008");
const amortizacao = saldo.div(100);
const prestacao = juros.add(amortizacao);

console.log(prestacao.commit(2)); // "3600.00"
```

---

## 2. Cenários Contábeis

### 2.1 Depreciação Linear Mensal
**Cenário:** Ativo de R$ 50.000,00, valor residual de R$ 5.000,00, vida útil de 5 anos.
```typescript
const custo = CurrencyNBR.from(50000);
const residual = CurrencyNBR.from(5000);
const meses = 60;
const depMensal = custo.sub(residual).group().div(meses);

console.log(depMensal.commit(2));  // "750.00"
console.log(depMensal.toLaTeX(2)); // $$ \frac{\left( 50000 - 5000 \right)}{60} = 750.00 $$
```

### 2.2 Custo Médio Ponderado (Estoque)
**Cenário:** 10 un a R$ 100 + 5 un a R$ 120.
```typescript
const lote1 = CurrencyNBR.from(10).mult(100);
const lote2 = CurrencyNBR.from(5).mult(120);
const qtdTotal = CurrencyNBR.from(10).add(5).group();
const custoMedio = lote1.add(lote2).group().div(qtdTotal);

console.log(custoMedio.commit(2)); // "106.67"
```

---

## 3. Cenários Fiscais

### 3.1 Cálculo de ICMS "por Dentro"
**Cenário:** Mercadoria de R$ 1.000,00 com alíquota de 18%. O imposto compõe sua própria base.
```typescript
const valorOriginal = CurrencyNBR.from(1000);
const aliquota = CurrencyNBR.from("0.18");
const baseCalculo = valorOriginal.div(CurrencyNBR.from(1).sub(aliquota).group());

console.log(baseCalculo.commit(2)); // "1219.51"
```

### 3.2 Retenção de IRRF
**Cenário:** Base de R$ 5.000,00, alíquota de 27,5% e dedução de R$ 896,00.
```typescript
const irrf = CurrencyNBR.from(5000).mult("0.275").sub(896);

console.log(irrf.commit(2));   // "479.00"
console.log(irrf.toVerbal(2)); // "5000 multiplicado por 0,275 menos 896 é igual a 479 vírgula 00"
```

---

## 4. Matemática Pura

### 4.1 Discriminante de Baskhara (Delta)
**Cenário:** $a=1, b=-5, c=6$ -> $\Delta = b^2 - 4ac$
```typescript
const a = CurrencyNBR.from(1);
const b = CurrencyNBR.from(-5);
const c = CurrencyNBR.from(6);

const delta = b.pow(2).sub(CurrencyNBR.from(4).mult(a).mult(c));

console.log(delta.commit(0));  // "1.0"
console.log(delta.toLaTeX(0)); // $$ {-5}^{2} - 4 \times 1 \times 6 = 1 $$
```

### 4.2 Raiz N-ésima com Potência
**Cenário:** $8^{2/3}$ (Raiz cúbica de oito ao quadrado).
```typescript
const res = CurrencyNBR.from(8).pow("2/3");

console.log(res.commit(2));   // "4.00"
console.log(res.toLaTeX(2));  // $$ \sqrt[3]{8^{2}} = 4.00 $$
console.log(res.toVerbal(2)); // "raiz de índice 3 de 8 elevado a 2 é igual a 4 vírgula 00"
```

---

## 5. Precisão e Normas

### 5.1 Correção do Erro de Ponto Flutuante
```typescript
const erroJS = 0.1 + 0.2; // 0.30000000000000004
const correcao = CurrencyNBR.from("0.1").add("0.2");

console.log(correcao.commit(1)); // "0.3" (Exatidão absoluta)
```

### 5.2 Arredondamento ABNT NBR 5891 (Regra do Par)
A biblioteca evita o viés de arredondamento sempre para cima.
```typescript
// 1.225 -> Anterior par (2), mantém
console.log(CurrencyNBR.from("1.225").commit(2)); // "1.22"

// 1.235 -> Anterior ímpar (3), aumenta
console.log(CurrencyNBR.from("1.235").commit(2)); // "1.24"
```

---

## 6. Cadeia de Auditoria Complexa
Demonstração de como a lib organiza uma sequência longa de operações.
```typescript
const resultado = CurrencyNBR.from(100)
  .add(50)
  .group()
  .mult(2)
  .sub(CurrencyNBR.from(500).div(10))
  .group()
  .pow("1/2");

console.log(resultado.commit(4)); 
// Resultado: 15.8114 (sqrt((100+50)*2 - 50))

console.log(resultado.toLaTeX(4));
// $$ \sqrt[2]{\left( \left( 100 + 50 \right) \times 2 - \frac{500}{10} \right)} = 15.8114 $$
```
