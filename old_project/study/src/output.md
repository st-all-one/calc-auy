# Auditoria Técnica: output.ts

## Propósito
Este arquivo contém a classe `CalcAUDOutput`, que é gerada ao finalizar um cálculo via `commit()`. Sua função é formatar e exportar o resultado final do cálculo para múltiplos formatos (Monetário, LaTeX, HTML, Verbal, Unicode e Imagem), aplicando as estratégias de arredondamento configuradas.

## Implementação Técnica
- **Lazy Rounding (Cache Privado):** Utiliza um mecanismo de cache interno (`_cachedStringValue`, `_cachedCentsValue`). O arredondamento só é calculado na primeira vez que um método de saída é chamado, otimizando a performance se múltiplos formatos forem solicitados.
- **Multiformato:** Centraliza a orquestração de diversos helpers de saída (`formatting.ts`, `html_generator.ts`, `image_generator.ts`, etc).
- **Tratamento de Arredondamento:** Aplica a estratégia selecionada (ex: NBR-5891, HALF-EVEN) através do helper `outputLazyRounding`.
- **Custom Output Hook:** Oferece o método `toCustomOutput`, permitindo que usuários da biblioteca implementem seus próprios processadores de saída mantendo acesso aos dados brutos de auditoria.

## Onde/Como é usado
- **src/main.ts:** Gerado ao final da cadeia de cálculo via método `commit()`.
- **Dependências:** Integra-se com todos os arquivos da pasta `src/output_helpers/`.

## Padrões de Design
- **Lazy Initialization/Cache:** Evita cálculos redundantes de arredondamento.
- **Strategy Pattern (implícito):** Permite a troca de estratégias de arredondamento e locais de formatação em runtime.
- **Data Transfer Object (DTO):** Carrega o estado consolidado do cálculo para a camada de visualização ou persistência.

## Observações de Auditor Sênior
- **Segurança:** O uso de `toCentsInBigInt()` é a recomendação padrão para persistência em banco de dados, evitando a perda de precisão comum com tipos `Float` ou `Double`.
- **Precisão:** O método `getUnroundedString()` provê transparência total para auditoria, mostrando o valor real sem arredondamento na 12ª casa decimal, essencial para reconciliação fiscal.
- **A11y:** O método `toHTML()` inclui o `aria-label` verbalizado nativamente, garantindo que fórmulas visuais complexas sejam compreensíveis por leitores de tela.
