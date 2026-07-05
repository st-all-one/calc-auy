# Receitas: Auditoria Legal

## Prova Matemática (LaTeX)

### Memorial de cálculo para anexar a laudos periciais

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

const Pericia = CalcAUY.create({
    contextLabel: "laudo-pericial",
    salt: "perito-2026",
    roundStrategy: "NBR5891",
});

const resultado = await Pericia
    .from(150_000)
    .setMetadata("rubrica", "Valor da Causa")
    .mult("1.2%")
    .setMetadata("rubrica", "Juros Moratórios (Art. 406 CC)")
    .add(Pericia.from(150_000).mult("10%"))
    .setMetadata("rubrica", "Honorários Sucumbenciais (Art. 85 CPC)")
    .add(3_000)
    .setMetadata("rubrica", "Custas Processuais")
    .commit();

// Gera prova matemática pronta para LaTeX
console.log(resultado.toLaTeX());
// \text{round}_{\text{NBR-5891}}(150000 \times 1.2\% + 150000 \times 10\% + 3000, 2) = 171800.00

// O LaTeX gerado pode ser incluído diretamente em relatórios acadêmicos ou jurídicos
```

### Combinando toLaTeX + toAuditTrace para dossiê completo

```typescript
// Dossiê pericial com múltiplas provas
const dossie = {
    provaMatematica: resultado.toLaTeX(),
    rastroAssinado: JSON.parse(resultado.toAuditTrace()),
    formatoAcessivel: resultado.toVerbalA11y({ locale: "pt-BR" }),
    diagramaTemporal: resultado.toMermaidGraph({ locale: "pt-BR" }),
};

console.log(JSON.stringify(dossie, null, 2));
// {
//   "provaMatematica": "\\text{round}_{\\text{NBR-5891}}(...)",
//   "rastroAssinado": { "ast": {...}, "finalResult": {...}, "signature": "a1b2..." },
//   "formatoAcessivel": "150000 multiplicado por 1.2% ...",
//   "diagramaTemporal": "sequenceDiagram\\n  autonumber\\n  ..."
// }
```

## Verificação de Integridade

### Auditor independente validando o lacre BLAKE3

```typescript
const Auditoria = CalcAUY.create({
    contextLabel: "auditoria-externa",
    salt: "auditor-salt",     // salt do auditor — diferente do original
    roundStrategy: "NBR5891",
});

// === CENÁRIO 1: INTEGRIDADE PRESERVADA ===
// O perito recebe o rastro assinado pelo sistema de origem
const traceOriginal = resultado.toAuditTrace();

// Verificação estática (sem recriar a árvore)
const valido = await CalcAUY.checkIntegrity(traceOriginal, {
    salt: "perito-2026", // salt QUEM assinou
});
console.log(`Rastro íntegro: ${valido}`); // true

// Re-hidratação para auditoria ativa
const reconstruido = await Auditoria.hydrate(traceOriginal, {
    salt: "perito-2026",
});
const verificacao = await reconstruido.commit();
console.log(verificacao.toStringNumber()); // "171800.00" — idêntico

// === CENÁRIO 2: FRAUDE DETECTADA ===
const traceViolado = traceOriginal.replace('"150000"', '"999999"');

try {
    await CalcAUY.checkIntegrity(traceViolado, { salt: "perito-2026" });
} catch (err) {
    console.error(`Violação crítica: ${err.detail}`);
    // "Integrity violation detected: signature does not match content."
    // O sistema sabe exatamente o hash esperado vs recebido
}
```

### Hibernação + hidratação em fluxo de aprovação

```typescript
// 1. Analista prepara o cálculo
const draft = await Pericia
    .from(50_000)
    .setMetadata("status", "rascunho")
    .mult("1.5%")
    .hibernate();

// 2. Gestor re-hidrata, revisa e finaliza
const resumed = await Auditoria.hydrate(draft, { salt: "perito-2026" });
const approved = await resumed
    .add(2_500)
    .setMetadata("status", "aprovado")
    .setMetadata("aprovador", "gestor_123")
    .commit();

console.log(`Valor final: ${approved.toMonetary()}`);
```

## Rastro Cronológico (Mermaid)

### Diagrama sequencial para visual forense

```typescript
const calc = await Pericia
    .from(100_000)
    .setMetadata("evento", "Ajuizamento da Ação")
    .add("10%")
    .setMetadata("fundamento", "Verbas Sucumbenciais")
    .mult(Pericia.from(1).add("0.5%").setMetadata("indice", "INPC/2026").group().pow(6))
    .setMetadata("evento", "Correção Monetária (6 meses)")
    .commit();

// Gera diagrama Mermaid com linha do tempo
const mermaid = calc.toMermaidGraph({ locale: "pt-BR" });
console.log(mermaid);
// sequenceDiagram
//     autonumber
//     participant Ctx_laudo_pericial as Contexto: laudo-pericial
//
//     activate Ctx_laudo_pericial
//     Note over Ctx_laudo_pericial: 26-05-03 14:00 (UTC)<br/>Ingestão: 100000<br/>[evento: Ajuizamento da Ação]
//     Ctx_laudo_pericial->>Ctx_laudo_pericial: Operation: add<br/>[fundamento: Verbas Sucumbenciais]
//     Note over Ctx_laudo_pericial: Ingestão: 10%
//     Ctx_laudo_pericial->>+Ctx_laudo_pericial: Operation: mul
//     Note over Ctx_laudo_pericial: Sub-expressão (indice: INPC/2026)
//     Note over Ctx_laudo_pericial: 6 operações pow (Ocultas no diagrama principal)<br/>[evento: Correção Monetária (6 meses)]
//     Note over Ctx_laudo_pericial: 26-05-03 14:00 (UTC)<br/>Final Closing and Signature<br/>Signature: (Sig: f796f67a...)
//     deactivate Ctx_laudo_pericial
```

### Exportando o diagrama para relatório

```typescript
import { writeAll } from "@std/io";

// Salva o diagrama para incorporar em relatórios HTML/Markdown
const mermaidGraph = calc.toMermaidGraph({ locale: "pt-BR" });

// O diagrama pode ser renderizado por qualquer visualizador Mermaid
// (GitHub Markdown, mermaid.live, mermaid-cli, etc.)
console.log(`Diagrama gerado (${mermaidGraph.length} caracteres)`);

---

[↑ Voltar ao índice](../index.md)
```
