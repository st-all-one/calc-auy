# Receitas: Integração entre Contextos

## Auditoria Multi-empresa

Cada empresa (ou filial) opera com seu próprio contexto e chave de assinatura. A matriz consolida os resultados sem nunca acessar as chaves das filiais.

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

// === FILIAL NORTE ===
const BranchNorth = CalcAUY.create({
    contextLabel: "filial-norte",
    salt: "salt-norte",       // chave secreta — nunca compartilhada
    roundStrategy: "NBR5891",
});

const fatNorth = await BranchNorth
    .from(2_500_000)
    .sub("3%") // descontos regionais
    .setMetadata("regiao", "Norte")
    .setMetadata("periodo", "Q1/2026")
    .hibernate(); // retorna JSON assinado

// === FILIAL SUL ===
const BranchSouth = CalcAUY.create({
    contextLabel: "filial-sul",
    salt: "salt-sul",
    roundStrategy: "NBR5891",
});

const fatSouth = await BranchSouth
    .from(3_800_000)
    .add("5%") // adicional frete
    .setMetadata("regiao", "Sul")
    .setMetadata("periodo", "Q1/2026")
    .hibernate();

// === MATRIZ (CONSOLIDAÇÃO) ===
const HQ = CalcAUY.create({
    contextLabel: "matriz-consolidada",
    salt: "salt-matriz",
    roundStrategy: "HALF_EVEN",
});

// Importa o cálculo assinado da Filial Norte
// A matriz NÃO precisa saber o salt da filial
const importedNorth = await HQ.fromExternalInstance(fatNorth);
// Importa a Filial Sul
const importedSouth = await HQ.fromExternalInstance(fatSouth);

// Consolidação: Norte + Sul
const consolidado = await importedNorth
    .add(importedSouth)
    .setMetadata("tipo", "Consolidado Q1/2026")
    .commit();

console.log(`Faturamento Consolidado: ${consolidado.toMonetary()}`);
// R$ 6.207.500,00 (2.425.000 + 3.990.000)

// Verificação cruzada: a matriz pode validar a integridade
// do rastro sem conseguir decifrar os valores individuais
const trace = consolidado.toLiveTrace();
console.log(`Assinatura final: ${trace.signature}`);

// O rastro prova que:
// 1. O cálculo veio da Filial Norte (contextLabel: "filial-norte")
// 2. A assinatura original está intacta
// 3. A matriz apenas adicionou os dois valores
```

## Handover entre Jurisdições

### Cadeia de custódia: Tribunal → Instância Superior

```typescript
// === 1º GRAU (SENTENÇA ORIGINAL) ===
const CourtA = CalcAUY.create({
    contextLabel: "vara-civel",
    salt: "justica-1o-grau",
    roundStrategy: "NBR5891",
});

// Cálculo da condenação
const sentenca = await CourtA
    .from(50_000)
    .setMetadata("natureza", "Indenização por Danos Morais")
    .setMetadata("processo", "0012345-67.2026.8.26.0100")
    .mult("1.5%") // juros de mora
    .setMetadata("fundamentacao", "Art. 406 CC + Selic")
    .add(5_000)
    .setMetadata("natureza", "Honorários Advocatícios (10% Art. 85 CPC)")
    .hibernate();

console.log(`Sentença assinada: ${sentenca.slice(0, 80)}...`);

// === 2º GRAU (TRIBUNAL DE APELAÇÃO) ===
const CourtB = CalcAUY.create({
    contextLabel: "tribunal-apelacao",
    salt: "justica-2o-grau",
    roundStrategy: "NBR5891",
});

// Importa a sentença do 1º grau com cadeia de custódia
const recurso = await CourtB.fromExternalInstance(sentenca);

// Aplica majoração recursal (Art. 85 §11 CPC)
const acordao = await recurso
    .mult(CourtB.from(1).add("2%").setMetadata("majoracao", "Art. 85 §11 CPC"))
    .setMetadata("instancia", "TJ Apelação Cível")
    .setMetadata("relator", "Des. Silva")
    .setMetadata("data_julgamento", "2026-08-15")
    .commit();

console.log(`Valor final: ${acordao.toMonetary()}`);     // R$ 61.515,00
console.log(`Rastro LaTeX: ${acordao.toLaTeX()}`);
// round_NBR-5891((50000×1.5%+5000)×(1+2%), 2) = 61515.00

// O diagrama Mermaid mostra o handover entre jurisdições
console.log(acordao.toMermaidGraph({ locale: "pt-BR" }));
// sequenceDiagram
//   participant Ct1 as Contexto: vara-civel
//   participant Ct2 as Contexto: tribunal-apelacao
//   Ct1->>+Ct2: Passagem (Sig: 8cc47c58...)
//   Note over Ct2: Evento: reanimation_event
//   Note over Ct2: Ingestão: 1+2%
//   Ct2->>Ct2: Operação: mul [majoracao: Art. 85 §11 CPC]
```

### Verificação de integridade cross-context

```typescript
// Um auditor independente pode verificar a integridade
// sem precisar recriar os contextos:

const traceJson = acordao.toAuditTrace();
const auditoriaOk = await CalcAUY.checkIntegrity(traceJson, {
    salt: "justica-2o-grau", // salt do contexto final
});
console.log(`Integridade confirmada: ${auditoriaOk}`); // true

// Se qualquer bit for alterado, checkIntegrity lança erro
```

### Linhagem completa no rastro

O método `toLiveTrace()` expõe toda a cadeia de custódia programaticamente:

```typescript
const trace = acordao.toLiveTrace();

// Navega pela árvore para extrair a origem
// @ts-ignore
const origem = trace.ast.operands[0].child.metadata;
console.log(`Contexto original: ${origem.previousContextLabel}`); // "vara-civel"
console.log(`Assinatura original: ${origem.previousSignature?.slice(0, 16)}...`);

---

[↑ Voltar ao índice](../index.md)
```
