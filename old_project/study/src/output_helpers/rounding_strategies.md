# Auditoria Técnica: `src/output_helpers/rounding_strategies.ts`

## 1. Propósito
O módulo `rounding_strategies.ts` é o núcleo algorítmico de arredondamento da CalcAUD. Ele implementa estratégias determinísticas para converter valores de alta precisão (12 casas) em valores de exibição ou fiscais (ex: 2 casas) utilizando aritmética de `BigInt`. Suas funções são o fundamento para garantir a conformidade com normas técnicas nacionais e internacionais.

## 2. Implementação Técnica
Cada função é projetada para operar com o tipo `BigInt`, eliminando a necessidade de ponto flutuante.
- **`roundToPrecisionNBR5891` (ABNT NBR 5891:1977):**
  - **Lógica de Desempate:** Implementa o critério de "arredondamento ao par" para o ponto médio (0.5). Se o dígito anterior for par, mantém; se for ímpar, incrementa. Isso elimina o viés estatístico de arredondamento para cima em grandes conjuntos de dados fiscais.
- **`roundHalfUp` (Padrão Comercial):**
  - **Comportamento Simétrico:** Arredonda para longe do zero se a magnitude do resto for maior ou igual à metade do divisor.
- **`roundHalfEven` (Bancário/Estatístico):**
  - **Critério de Paridade:** Arredonda sempre para o número par mais próximo quando o resto é exatamente a metade do divisor (idêntico ao comportamento nativo de muitas linguagens financeiras).
- **`roundTruncate` e `roundCeil`:**
  - **Corte Seco:** Simplesmente descarta os decimais excedentes ou arredonda sempre em direção ao infinito positivo.

## 3. Onde e Como é Usado
- **Dependência Crítica:** É importado e consumido pelo `rounding_manager.ts`.
- **Fluxo de Dados:** Recebe o valor de 12 casas, a precisão alvo e retorna o valor BigInt já na escala correta para o output.

## 4. Padrões de Design
- **Strategy Pattern:** Fornece as implementações concretas das estratégias de arredondamento.
- **Pure Functional Logic:** Todas as funções são puras e sem efeitos colaterais.

## 5. Parecer do Auditor
- **Conformidade Técnica:** A implementação da NBR-5891 é rigorosa e fundamental para aplicações financeiras brasileiras. A detecção manual do "último dígito da parte integral" para o desempate ao par demonstra uma engenharia de precisão superior.
- **Segurança Numérica:** O uso de `divisor / 2n` garante que o ponto médio seja calculado com precisão absoluta dentro do domínio dos inteiros.
- **Observação:** O tratamento simétrico de números negativos em todos os métodos garante consistência em balanços de débito e crédito.
