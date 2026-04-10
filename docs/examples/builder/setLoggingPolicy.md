# Método: `CalcAUY.setLoggingPolicy()`

Gerencia a visibilidade de dados sensíveis (PII) nos logs de telemetria da biblioteca.

## Assinatura
```ts
public static setLoggingPolicy(policy: { sensitive: boolean }): typeof CalcAUY
public setLoggingPolicy(policy: { sensitive: boolean }): CalcAUY
```

## Exemplos de Uso

### 1. Desativando Proteção para Debug (Cuidado!)
Por padrão, a lib oculta valores reais. Você pode liberar a exibição para investigar problemas em ambiente de desenvolvimento.
```ts
CalcAUY.setLoggingPolicy({ sensitive: false });
```

### 2. Ativando Proteção em Produção (Padrão)
Garante que nenhum dado financeiro apareça nos logs do seu servidor.
```ts
CalcAUY.setLoggingPolicy({ sensitive: true });
```

## Níveis de Controle
Este método atua na **1ª Camada** de segurança. Quando `sensitive` é `true`:
- Valores literais aparecem como `[PII]`.
- Metadados sensíveis aparecem como `[PII]`.
- A estrutura da árvore (ex: soma de dois nós) continua visível para debug estrutural.
