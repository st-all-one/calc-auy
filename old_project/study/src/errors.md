# Auditoria Técnica: errors.ts

## Propósito
Este arquivo gerencia a tratativa de erros da biblioteca através da classe `CalcAUDError`. Ele é projetado para auditoria profunda, fornecendo detalhes ricos sobre falhas em cálculos e estados operacionais.

## Implementação Técnica
- **RFC 7807 (Problem Details):** A classe `CalcAUDError` implementa o padrão RFC 7807, tornando os erros serializáveis e consistentes em ambientes distribuídos.
- **Math Audit Metadata:** Inclui metadados customizados (`latex`, `unicode`, `operation`) no payload do erro. Isto permite que, ao capturar uma exceção, o sistema de logs identifique exatamente o estado da fórmula no momento do erro (ex: qual divisão causou erro de divisão por zero).
- **Audit Log ID (`instance`):** Gera um UUID único para cada instância de erro, facilitando a correlação entre logs de cliente e servidor.

## Onde/Como é usado
- **src/main.ts:** Para sinalizar entradas inválidas ou erros matemáticos críticos (div/0).
- **src/internal/parser.ts:** Durante a análise léxica de strings numéricas.
- **src/output.ts:** No tratamento de configurações de output (locales e métodos inválidos).

## Padrões de Design
- **Custom Exception:** Extensão da classe nativa `Error` para enriquecer a semântica de falha.
- **Problem Details Pattern:** Conformidade com padrões de mercado (RFC 7807) para interoperabilidade.

## Observações de Auditor Sênior
- **Segurança:** O uso de `crypto.randomUUID()` para o ID da instância assegura que as referências de auditoria não sejam previsíveis.
- **Precisão:** Ao incluir a expressão LaTeX/Unicode que falhou, o desenvolvedor tem uma ferramenta de depuração imediata e visualmente clara.
- **Manutenibilidade:** A função `logFatal` centraliza a telemetria de erros não tratados no namespace `errors.fatal`, essencial para sistemas de alerta.
