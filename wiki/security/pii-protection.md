# Proteção de Dados Sensíveis (PII)

A CalcAUY implementa um sistema de proteção de dados sensíveis em **3 camadas**, operando sob o modelo de jurisdições isoladas.

## Camada 1: Política por Instância

O controle de segurança é definido no momento da criação da jurisdição via `CalcAUY.create()`:

```typescript
const segura = CalcAUY.create({
  contextLabel: "bank",
  sensitive: true,  // DEFAULT: ativo
  salt: "segredo123",
});
```

- `sensitive: true` (padrão) → ofusca valores, input original e metadados em logs/erros
- `sensitive: false` → valores visíveis

## Camada 2: Controle Granular via Metadata

Marque nós individuais da AST para forçar ou liberar visibilidade:

```typescript
calc.from(5000).setMetadata("pii", true);       // oculta nos logs
calc.from(0.18).setMetadata("pii", false);       // visível (ex: alíquota pública)
```

## Camada 3: Herança em Cascata

A política de sensibilidade propaga-se automaticamente pela árvore:

1. Nós `literal` herdam o estado do nó pai
2. Marcar uma operação como sensível protege todos os sub-nós
3. O nó `control` atua como barreira em handovers cross-context

### Exceções (sempre visíveis)

Metadados do nó `control` — `previousContextLabel`, `previousSignature`, `previousRoundStrategy` — **nunca** são redigidos, garantindo rastreabilidade mesmo em modo restrito.

---

[↑ Voltar ao índice](../index.md)
