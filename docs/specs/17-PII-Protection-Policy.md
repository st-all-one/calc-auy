# 17 - Política de Proteção de PII (Security by Default)

## Objetivo
Definir o sistema de camadas para proteção de Informações Pessoais Identificáveis (PII) e dados sensíveis de negócio nos logs de telemetria da CalcAUY. A engine adota o princípio de **Segurança por Padrão**, garantindo que nenhum dado financeiro ou metadado sensível vaze para sistemas de monitoramento externos sem autorização explícita.

## Camada 1: Política Global (`setLoggingPolicy`)
A primeira camada de controle é global e afeta toda a instância (ou classe) durante a construção e saída do cálculo.

- **Método:** `CalcAUY.setLoggingPolicy({ sensitive: boolean })`
- **Comportamento:**
    - `sensitive: true` (**Padrão**): Os dados são considerados sensíveis. Valores de entrada, resultados intermediários e metadados são substituídos pelo marcador `[PII]` nos logs.
    - `sensitive: false`: Desativa a proteção global. Os logs exibirão os valores reais para fins de depuração profunda (apenas em ambiente seguro).

## Camada 2: Sobreposição por Nó (`setMetadata("pii", ...)`)
A segunda camada permite um controle granular cirúrgico em nós específicos da AST, sobrepondo a decisão da política global.

- **Método:** `setMetadata("pii", boolean)`
- **Comportamento:**
    - `pii: true`: Identifica que o nó **é sensível**. Força a OCULTAÇÃO (`[PII]`) mesmo que a política global esteja em `false`.
    - `pii: false`: Identifica que o nó **não é sensível**. Força a EXIBIÇÃO do dado real mesmo que a política global esteja em `true`.

## Hierarquia de Decisão (shouldHide)

| Política Global (`sensitive`) | Metadado do Nó (`pii`) | Resultado no Log |
| :--- | :--- | :--- |
| `true` (Padrão) | *não definido* | **OCULTO** (`[PII]`) |
| `true` | `true` | **OCULTO** (`[PII]`) |
| `true` | `false` | **EXIBIDO** (Dado Real) |
| `false` | *não definido* | **EXIBIDO** (Dado Real) |
| `false` | `true` | **OCULTO** (`[PII]`) |
| `false` | `false` | **EXIBIDO** (Dado Real) |

## Sanitização de Objetos e Erros
O utilitário `sanitizeObject` aplica estas regras recursivamente em:
1.  **Logs de Debug:** Durante a construção da AST (`builder.ts`).
2.  **Logs de Info:** Durante a geração de outputs (`output.ts`).
3.  **Logs de Erro:** Antes de disparar telemetria no construtor de `CalcAUYError`.

## Exemplo de Uso

```ts
// Ativando exibição global para debug
CalcAUY.setLoggingPolicy({ sensitive: false });

// Forçando ocultação apenas em um valor extremamente sensível
const calc = CalcAUY.from(5000)
  .setMetadata("pii", true) // Este nó será [PII] no log
  .add(150); // Este nó aparecerá como 150 no log
```

## Benefícios
Esta abordagem garante que a CalcAUY seja compatível com regulamentações rígidas de privacidade (LGPD, GDPR e PCI-DSS), permitindo que logs de produção sejam coletados sem risco de vazamento de dados bancários ou financeiros dos usuários.
