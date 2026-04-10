# Método: `.toAuditTrace()` e `.toJSON()`

Gera snapshots técnicos completos para validação por sistemas de terceiros ou armazenamento de rastro histórico.

## Assinatura
```ts
public toAuditTrace(): string
public toJSON(outputs?: string[], options?: OutputOptions): string
```

## Exemplos de Uso

### 1. Rastro Forense Completo
O `toAuditTrace()` exporta a árvore AST, os resultados parciais e a estratégia de arredondamento.
```ts
const trace = output.toAuditTrace();
// Salvar no log de auditoria
await db.forensics.save({ trace });
```

### 2. Consolidação para APIs REST
O `toJSON()` permite entregar múltiplos formatos de uma vez.
```ts
const payload = output.toJSON(["toMonetary", "toLaTeX", "toVerbalA11y"]);
return new Response(payload);
```

## Diferenciais
- **Independência:** O snapshot JSON contém dados suficientes para que outro sistema reconstrua e valide o cálculo sem precisar do código fonte original.
- **Flexibilidade:** No `toJSON()`, você escolhe quais "visões" do cálculo deseja exportar para o front-end.
