# Auditoria Técnica: logger.ts

## Propósito
O `logger.ts` centraliza a telemetria estruturada da biblioteca, provendo um ponto único de instrumentação que segue os princípios de logs "dry" e baseados em namespace.

## Implementação Técnica
- **LogTape Framework:** Utiliza o `@logtape` como base.
- **Hierarquia de Namespaces:** Define o namespace raiz `["calcaud-nbr-a11y"]`. Isto permite filtragem refinada em ambientes de produção.

## Onde/Como é usado
- **src/main.ts:** Para logar cada operação do motor (`engine`, `input`).
- **src/output.ts:** Para monitorar o tempo de geração dos formatos de saída (`output`).
- **src/errors.ts:** Para logar exceções de forma estruturada.

## Padrões de Design
- **Singleton/Service:** Provê uma instância única e global para telemetria em todo o pacote.

## Observações de Auditor Sênior
- **Manutenibilidade:** O uso de namespaces (`getChild`) facilita enormemente a auditoria seletiva (ex: observar apenas logs de `engine/mult` sem ser poluído por outros dados).
- **Segurança:** O logger é passivo e não grava informações sensíveis a menos que sejam explicitamente passadas como contexto no momento do erro.
