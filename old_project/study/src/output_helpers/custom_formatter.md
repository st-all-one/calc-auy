# Auditoria Técnica: `src/output_helpers/custom_formatter.ts`

## 1. Propósito
O módulo `custom_formatter.ts` provê o mecanismo de extensibilidade da CalcAUD para formatos de saída. Ele define a interface funcional necessária para que desenvolvedores externos criem seus próprios processadores de dados, permitindo a integração da biblioteca com protocolos proprietários, sistemas de log especializados ou exportadores para formatos não suportados nativamente (como Protobuf ou XML).

## 2. Implementação Técnica
A implementação baseia-se em tipos funcionais genéricos do TypeScript.
- **Interface `ICalcAUDCustomOutput<Toutput>`:** Define uma função que recebe um contexto de dados e retorna um tipo genérico `Toutput` definido pelo desenvolvedor.
- **Contexto de Dados (`ICalcAUDCustomOutputContext`):**
  - **Dados Brutos:** Disponibiliza o valor `BigInt`, a precisão decimal, as expressões em LaTeX, Unicode e Verbal, além das opções de configuração originais.
  - **Acesso a Métodos:** Oferece acesso aos métodos de saída padrão (através de `Pick<CalcAUDOutput, ...>`), permitindo que o formatador customizado reutilize a lógica de `toString`, `toMonetary`, etc., em sua própria composição.

## 3. Onde e Como é Usado
- **Dependência de Extensão:** É importado pela classe `CalcAUDOutput` (`src/output.ts`).
- **Fluxo de Dados:** O usuário chama `toCustomOutput(processor)`, e a biblioteca injeta o estado interno do cálculo no processador fornecido.

## 4. Padrões de Design
- **Strategy Pattern (Extensible):** Permite injetar lógica de processamento de saída em tempo de execução.
- **Dependency Injection (Lightweight):** O estado interno é injetado no processador externo através do objeto `context`.

## 5. Parecer do Auditor
- **Arquitetura Aberta:** Esta implementação é excelente para evitar o "bloat" da biblioteca principal, permitindo que casos de uso específicos de nicho sejam resolvidos externamente.
- **Proteção de Dados:** Ao fornecer o contexto como `Readonly`, a biblioteca garante que o formatador customizado não possa alterar o estado interno do cálculo original, preservando a imutabilidade do objeto `CalcAUDOutput`.
