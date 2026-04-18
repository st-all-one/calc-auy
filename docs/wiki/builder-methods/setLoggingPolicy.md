# Método: `setLoggingPolicy()` (Static & Instance)

O `setLoggingPolicy()` é a primeira linha de defesa da CalcAUY para conformidade com leis de proteção de dados (como LGPD e GDPR). Ele define a política global ou de instância sobre como dados sensíveis devem ser tratados nos logs de telemetria.

## ⚙️ Funcionamento Interno

1.  **Estado Global vs. Instância:**
    -   **Static:** Altera a flag `sensitive` no singleton de configuração global, afetando todas as novas instâncias.
    -   **Instance:** Altera a política para o fluxo de construção atual, permitindo controle granular em sistemas multi-tenant.
2.  **Mecanismo de Redação:** Quando `sensitive` é `true` (padrão), o sanitizador interno substitui valores numéricos e detalhes de nós da AST pelo marcador `[PII]` em logs de nível `info` ou `debug`.
3.  **Prioridade de Metadata:** A política global pode ser sobrescrita em nós específicos através do metadado `pii: false`, permitindo que valores públicos (como uma taxa fixa de imposto) sejam exibidos mesmo em modo sensível.
4.  **Imutabilidade Fluida:** A versão de instância retorna `this`, permitindo a configuração no meio de um encadeamento de métodos.

## 🎯 Propósito
Impedir o vazamento acidental de dados financeiros de clientes ou segredos de negócio em logs de infraestrutura, mantendo a telemetria técnica ativa.

## 💼 10 Casos de Uso Reais

1.  **Configuração de Ambiente de Produção:** Ativar a ocultação total de dados em servidores produtivos.
```typescript
// Exemplo 1: Setup global na inicialização do app
CalcAUY.setLoggingPolicy({ sensitive: true });
```
```typescript
// Exemplo 2: Aplicação via variável de ambiente
CalcAUY.setLoggingPolicy({ sensitive: process.env.NODE_ENV === "production" });
```

2.  **Depuração Segura em Testes:** Liberar logs para inspeção de valores durante o desenvolvimento.
```typescript
// Exemplo 1: Setup para ambiente local
CalcAUY.setLoggingPolicy({ sensitive: false });
```
```typescript
// Exemplo 2: Habilitação temporária para debug
const res = calc.setLoggingPolicy({ sensitive: false }).add(10).commit();
```

3.  **Ativação via Painel de Controle (Runtime):** Alternar a visibilidade de logs globalmente sem reiniciar o serviço.
```typescript
// Exemplo 1: Handler de sinal ou endpoint de administração
onAdminCommand("enable-logs", () => CalcAUY.setLoggingPolicy({ sensitive: false }));
```
```typescript
// Exemplo 2: Timeout de debug (volta para sensível após 5 min)
setTimeout(() => CalcAUY.setLoggingPolicy({ sensitive: true }), 300_000);
```

4.  **Logs de Auditoria Governamental:** Permitir visibilidade total para órgãos reguladores.
```typescript
// Exemplo 1: Exportação para rastro do fisco
const audit = CalcAUY.from(base).setLoggingPolicy({ sensitive: false });
```
```typescript
// Exemplo 2: Chamada por perito técnico
res.setLoggingPolicy({ sensitive: false }).toAuditTrace();
```

5.  **Sanitização de Erros:** Garantir que logs de erro não exponham o valor da transação que falhou.
```typescript
// Exemplo 1: Tratamento de exceção padrão
try { /* ... */ } catch (e) { logger.error("Fail", { ctx: calc.hibernate() }); } // Valores redigidos se sensitive=true
```
```typescript
// Exemplo 2: Política estrita de erro
CalcAUY.setLoggingPolicy({ sensitive: true });
```

6.  **Integração com Dashboards de Log (ELK/Splunk):** Reduzir o risco de armazenamento de dados sensíveis em índices de busca.
```typescript
// Exemplo 1: Configuração global para ElasticSearch
CalcAUY.setLoggingPolicy({ sensitive: true });
```
```typescript
// Exemplo 2: Filtro de metadados para telemetria
const logReady = res.setLoggingPolicy({ sensitive: true });
```

7.  **Bootstrap de Microserviço:** Definir o estado de segurança durante a inicialização do container.
```typescript
// Exemplo 1: Setup inicial no arquivo main.ts
const bootstrap = () => {
  CalcAUY.setLoggingPolicy({ sensitive: config.LOGS_SENSITIVE });
};
```
```typescript
// Exemplo 2: Garantia de política antes de carregar módulos
CalcAUY.setLoggingPolicy({ sensitive: true });
```

8.  **Chave Mestra de Segurança (Kill Switch):** Garantir que nenhum log técnico vaze dados em modo de conformidade estrita.
```typescript
// Exemplo 1: Forçamento global em rota crítica
app.post("/critical-op", () => {
  CalcAUY.setLoggingPolicy({ sensitive: true }); // Chave mestra ligada
  return process();
});
```
```typescript
// Exemplo 2: Trava de auditoria em produção
if (IS_PROD) CalcAUY.setLoggingPolicy({ sensitive: true });
```

9.  **Configuração por Camada de Infraestrutura:** Ajustar a sensibilidade baseada em onde o código está rodando.
```typescript
// Exemplo 1: Sensível em Cloud, Aberto em Edge/Local
const isCloud = !!Deno.env.get("CLOUD_ENV");
CalcAUY.setLoggingPolicy({ sensitive: isCloud });
```
```typescript
// Exemplo 2: Política baseada em permissão de container
CalcAUY.setLoggingPolicy({ sensitive: canLogBruteData() });
```

10. **Conformidade com PCI-DSS:** Garantir que valores de transação de cartão não sejam logados.
```typescript
// Exemplo 1: Gateway de cartões
const payment = CalcAUY.from(amount).setLoggingPolicy({ sensitive: true });
```
```typescript
// Exemplo 2: Autorização de débito
const auth = res.setLoggingPolicy({ sensitive: true }).commit();
```

## 🛠️ Opções Permitidas

- `policy`: `object`
    - `sensitive`: `boolean` (Define se o dado deve ser redigido nos logs).

## 🛡️ Caso Especial: Controle Granular via Metadado `pii`

Embora o `setLoggingPolicy()` controle o comportamento global da biblioteca, a CalcAUY permite um controle cirúrgico por nó através do método `.setMetadata("pii", boolean)`.

- **Sobrescrita Local:** O valor definido no metadado `pii` tem precedência sobre a política global.
- **`.setMetadata("pii", true)`**: Força a ocultação deste nó específico, mesmo que a política global esteja definida como `{ sensitive: false }`.
- **`.setMetadata("pii", false)`**: Força a exibição deste nó específico (ex: uma taxa fixa pública), mesmo que a política global esteja definida como `{ sensitive: true }`.

Isso garante que informações sensíveis específicas sejam protegidas independentemente da configuração de debug do ambiente, ao mesmo tempo que permite transparência para dados não sensíveis em ambientes restritos.

## 🏗️ Anotações de Engenharia
- **Impacto de Performance:** A checagem da política é feita no `sanitizer.ts`. Ela utiliza flags booleanas de acesso O(1), garantindo que o custo de segurança seja insignificante perto da latência de I/O de logs.
- **Camadas de Segurança:** A CalcAUY opera com o princípio de "Defesa em Profundidade". Mesmo que o `setLoggingPolicy` seja desativado, um nó marcado individualmente com `pii: true` permanecerá oculto.
- **LogTape 2.0:** A política é integrada nativamente aos metadados do LogTape, permitindo que sinks de log tomem decisões baseadas na sensibilidade do payload.
