# Integração entre Jurisdições (Cross-Context)

## Por que Isolamento?

Cada instância `CalcAUY.create()` possui seu próprio `salt`, `contextLabel` e identidade `Symbol`. Isso garante:

- **Separação legal/regulatória:** diferentes jurisdições fiscais, societárias ou contratuais não misturam dados
- **Auditabilidade individual:** cada contexto mantém sua própria cadeia de assinatura
- **Segurança por compartimentalização:** uma instância comprometida não contamina as demais

Tentar usar `.add(instanciaDeOutroContexto)` lança `instance-mismatch`. A única ponte permitida é `fromExternalInstance()`.

## O Portal `fromExternalInstance()`

```typescript
CalcAUYLogic.fromExternalInstance(
  externalInstance: CalcAUYLogic | string | object
): Promise<CalcAUYLogic>
```

**Fluxo:**

1. **Se `externalInstance` é um `CalcAUYLogic` vivo:** o método executa `hibernate()` imediatamente para obter a AST assinada. Valida a assinatura contra o salt da instância externa.
2. **Se é uma string JSON ou objeto serializado:** valida a assinatura contida no payload.
3. **Cria `ControlNode`** com metadados de procedência:
   - `previousContextLabel` — contexto de origem
   - `previousSignature` — assinatura validada
   - `previousRoundStrategy` — estratégia original
4. **Se instância vazia:** a árvore externa torna-se a raiz do cálculo, herdando o `birthTime` original.
5. **Se instância já populada:** une via `crossContextAdd`, agregando o cálculo externo como um operando.

**O nó de controle é sempre agrupado** em um `GroupNode` para garantir precedência e atomicidade.

## Exemplos

### 1. Autoridade Fiscal integrando com Contabilidade

```typescript
const TaxAuthority = CalcAUY.create({
  contextLabel: "tax-authority",
  salt: "tax-secret",
  roundStrategy: "NBR5891",
});

const Accounting = CalcAUY.create({
  contextLabel: "accounting-firm",
  salt: "audit-secret",
});

// Contabilidade prepara a base de cálculo
const declaredRevenue = Accounting.from(2_500_000)
  .setMetadata("year", "2026")
  .setMetadata("standard", "IFRS");

// Autoridade fiscal importa o valor declarado
const assessment = await TaxAuthority.fromExternalInstance(declaredRevenue);
const result = await assessment.mult("15%").setMetadata("tax_rate", "IRPJ").commit();
// O audit trace mostrará a transição: accounting-firm → tax-authority
```

### 2. Consolidação Multi-Jurisdição

```typescript
const HQ = CalcAUY.create({ contextLabel: "corporate", salt: "hq-secret" });
const BranchNY = CalcAUY.create({ contextLabel: "branch-ny", salt: "ny-vault" });
const BranchLN = CalcAUY.create({ contextLabel: "branch-london", salt: "ln-vault" });

const nyTotal = BranchNY.from(1_200_000).setMetadata("region", "NY");
const lnTotal = BranchLN.from(950_000).setMetadata("region", "LN");

const consolidated = await HQ.fromExternalInstance(nyTotal);
await consolidated.fromExternalInstance(lnTotal);

const final = await consolidated.commit();
// O diagrama Mermaid mostrará os 3 contextos com handover assinado entre eles
```

### 3. Cadeia de Auditoria Legal (Lower Court → High Court)

```typescript
const CourtA = CalcAUY.create({
  contextLabel: "lower-court",
  salt: "justice-1",
});

const basePenalty = CourtA.from(30).setMetadata("crime", "theft");
const signedVerdict = await basePenalty.hibernate();

const CourtB = CalcAUY.create({
  contextLabel: "appellate-court",
  salt: "justice-2",
});

const appeal = await CourtB.fromExternalInstance(signedVerdict);
const finalVerdict = await appeal.mult(1.5).setMetadata("aggravator", "recidivism").commit();
// O audit trace preserva: lower-court → appellate-court com assinaturas originais
```

---

[↑ Voltar ao índice](../index.md)
