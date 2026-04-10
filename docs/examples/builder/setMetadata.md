# Método: `.setMetadata()`

Anexa contexto de negócio ao nó atual da árvore. É o pilar fundamental da **Auditabilidade Forense**.

## Assinatura
```ts
public setMetadata(key: string, value: MetadataValue): CalcAUY
```

## Exemplos de Uso

### 1. Justificando uma Operação
```ts
const calc = CalcAUY.from(100).add(10).setMetadata("motivo", "Taxa de Conveniência");
```

### 2. Vinculando Identificadores de Banco de Dados
```ts
calc.setMetadata("invoice_id", "2026-ABC-99");
```

### 3. Controle Granular de Privacidade (PII)
Você pode usar a chave especial `pii` para ocultar ou mostrar um nó específico, sobrepondo a política global.
```ts
// Oculta este nó mesmo se o log global estiver liberado
calc.setMetadata("pii", true); 

// Mostra este nó (ex: uma taxa pública) mesmo se o log global estiver protegido
calc.setMetadata("pii", false); 
```

## Importante
Os metadados devem ser objetos planos, strings, números ou booleans serializáveis. Eles serão incluídos no snapshot do `toAuditTrace()`.
