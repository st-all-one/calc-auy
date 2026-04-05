# Auditoria Técnica: `src/output_helpers/rounding_manager.ts`

## 1. Propósito
O módulo `rounding_manager.ts` é o orquestrador central das operações de arredondamento da CalcAUD. Sua função principal é atuar como uma fachada (Facade) que simplifica o acesso às diversas estratégias de arredondamento, garantindo que o motor de cálculo possa solicitar um ajuste de precisão sem se preocupar com a implementação técnica específica de cada algoritmo.

## 2. Implementação Técnica
A implementação baseia-se em um padrão de despacho simples e robusto.
- **Função `applyRounding`:** Recebe o valor bruto (`BigInt`), o método desejado (`RoundingMethod`), a escala atual e a escala alvo.
- **Mecanismo de Despacho:** Utiliza um bloco `switch` para direcionar a operação para a função correspondente no módulo `rounding_strategies.ts`.
- **Flexibilidade de Escala:** Gerencia a transição entre a escala interna fixa (10^12) e a escala de saída dinâmica solicitada pelo usuário (ex: 10^2 para centavos).

## 3. Onde e Como é Usado
- **Dependência de Saída:** É importado e consumido pelo `lazy_rounding.ts`.
- **Fluxo de Dados:** Recebe o valor bruto de 12 casas decimais e retorna o valor já arredondado na escala reduzida desejada.

## 4. Padrões de Design
- **Facade Pattern:** Oculta a complexidade das múltiplas implementações de arredondamento por trás de uma única função de interface (`applyRounding`).
- **Orchestration Pattern:** Gerencia o fluxo de dados entre o valor bruto e a estratégia de processamento.

## 5. Parecer do Auditor
- **Segurança de Execução:** O uso do valor `NBR-5891` como caso padrão (`default`) no `switch` reforça a diretriz de conformidade fiscal brasileira da biblioteca, garantindo que, em caso de erro de configuração, o sistema opte pelo método mais rigoroso.
- **Arquitetura Limpa:** A separação entre o gerenciador (manager) e as estratégias (strategies) permite que novos métodos de arredondamento sejam adicionados no futuro com impacto mínimo no restante da base de código.
