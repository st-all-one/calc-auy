# Resumo Técnico: Implementação e Funcionamento Geral

## 1. O Problema da Flutuação (IEEE 754)
Cálculos financeiros em JavaScript utilizando o tipo `Number` (ponto flutuante) sofrem de erros acumulados em operações simples como `0.1 + 0.2 != 0.3`. A CalcAUD elimina esse risco operando exclusivamente com `BigInt` em uma escala fixa de **10¹²**.

## 2. Pilares de Implementação
A auditoria identificou três pilares fundamentais no design do projeto:

### A. Precisão Absoluta (Fixed-Point Arithmetic)
- **Escalabilidade:** Todo valor de entrada é multiplicado pelo `INTERNAL_SCALE_FACTOR` (10¹²).
- **Integridade:** As operações de multiplicação e divisão utilizam arredondamento "Half-Up" manual na 12ª casa interna para evitar a propagação de resíduos infinitesimais.
- **Potenciação e Raízes:** Implementa o algoritmo **Square-and-Multiply** para potências e um motor híbrido de **Newton-Raphson/Busca Binária** para raízes n-ésimas, garantindo precisão mesmo em juros compostos complexos.

### B. Auditoria Nativa e Imutabilidade
- **State Accumulation:** A classe `CalcAUD` não altera seu estado. Cada operação (`add`, `sub`, `mult`, `div`, `pow`, `group`) retorna uma nova instância contendo o valor calculado e os rastros de auditoria em três formatos:
  - **LaTeX:** Para renderização matemática de alta qualidade.
  - **Unicode:** Para logs de texto puro e mensagens rápidas.
  - **Verbal (Tokens):** Para acessibilidade universal.

### C. Camada de Arredondamento Fiscal (NBR-5891)
- **Desempate ao Par:** O diferencial técnico da lib é a implementação rigorosa da norma brasileira **NBR-5891**, que resolve o problema do "viés estatístico" do arredondamento comercial através do critério de desempate ao par no ponto médio (0.5).

## 3. Funcionamento Geral do Fluxo
1. **Entrada:** `CalcAUD.from("1/3")` -> O parser converte para BigInt (333333333333n).
2. **Processamento:** `.mult(10).add(5).group().div(2)` -> O motor gera novas instâncias imutáveis a cada passo, protegendo a precedência com `wrappers.ts`.
3. **Commit:** `.commit(2)` -> Congela o cálculo e transfere para a classe `CalcAUDOutput`.
4. **Saída:** `.toMonetary()` ou `.toHTML()` -> O sistema resolve o cache de arredondamento (`lazy_rounding.ts`) e gera o formato solicitado.

## 4. Segurança e Robustez
- **RFC 7807:** Todos os erros (divisão por zero, overflow, tipos inválidos) seguem o padrão da RFC para APIs REST, permitindo rastreabilidade e serialização JSON.
- **Telemetria:** O sistema loga o tempo de execução de cada operação crítica (em milissegundos) para auditoria de performance.
