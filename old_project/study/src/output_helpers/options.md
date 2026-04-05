# Auditoria Técnica: `src/output_helpers/options.ts`

## 1. Propósito
O módulo `options.ts` define o contrato de configuração para o processamento de saída (output) da CalcAUD. Ele centraliza as definições de métodos de arredondamento, estratégias de divisão e as opções de localização que o usuário pode fornecer ao método `commit()`.

## 2. Implementação Técnica
A implementação utiliza as funcionalidades de tipo avançadas do TypeScript para garantir a segurança em tempo de compilação.
- **Tipagem Estrita:** Define tipos literais como `RoundingMethod` (arredondamento) e `MathDivModStrategy` (estratégia de divisão).
- **Validação de Métodos:** Exporta a constante `VALID_ROUNDING_METHODS` (`as const`), que serve tanto como base para a tipagem quanto para validações em runtime.
- **Valores Padrão:** Define a interface `CalcAUDOutputOptions` e o objeto `DEFAULT_OPTIONS`, que estabelece o padrão fiscal brasileiro: `NBR-5891`, locale `pt-BR` e moeda `BRL`.

## 3. Onde e Como é Usado
- **Dependência Global:** É importado por quase todos os módulos de saída, incluindo `CalcAUD` (`src/main.ts`), `CalcAUDOutput` (`src/output.ts`) e o gerenciador de arredondamento.
- **Fluxo de Configuração:** As opções definidas aqui são passadas no método `commit()` e propagadas para os helpers que realizam a formatação final e a tradução verbal.

## 4. Padrões de Design
- **Configuration Pattern:** Centraliza as políticas de comportamento da biblioteca.
- **Strategy Pattern (Definition):** Atua como o catálogo de estratégias disponíveis para o motor de cálculo.

## 5. Parecer do Auditor
- **Flexibilidade Fiscal:** A inclusão de estratégias de divisão (`euclidean` vs `truncated`) é um diferencial técnico importante para conformidade com diferentes linguagens de programação e regulamentações financeiras.
- **Segurança de Tipos:** O uso de `as const` para os métodos válidos previne que métodos de arredondamento não homologados sejam injetados no sistema.
