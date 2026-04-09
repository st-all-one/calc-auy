# 05 - Processadores de Saída e Auditoria Visual

## Objetivo
Traduzir a estrutura da AST em diferentes formatos de auditoria (LaTeX, HTML, Verbal, Unicode), mantendo total acessibilidade e transparência no rastro de cálculo através do CalcAUY.

## Inversão de Dependência para Renderizadores
Diferente da versão anterior, os geradores visuais não devem estar acoplados à classe principal. Devem ser implementados como `OutputProcessors` independentes que consomem a AST.

### Estrutura Sugerida
- `class KaTeXProcessor`: Recebe a AST e retorna uma string LaTeX ou HTML (com injeção de CSS opcional).
- `class VerbalProcessor`: Recebe a AST e um `Locale` para gerar a tradução verbal tokenizada (i18n).
- `class UnicodeProcessor`: Recebe a AST e gera a representação textual puro UTF-8 (subscritos/sobrescritos).

## Rastro Pleno e Auditabilidade
Cada processador deve percorrer a AST recursivamente.
- **LaTeX:** Deve utilizar parênteses elásticos (`\left(` / `\right)`) apenas quando necessário para manter a legibilidade, respeitando a precedência definida no `03-Parser-Rules.md`.
- **Verbal:** Deve manter a lógica de `GRP_START` / `GRP_END` para garantir que o agrupamento matemático seja lido corretamente por leitores de tela.

## Saída "Lazy" (Preguiçosa)
A geração de saídas (ex: `.toMonetary()`, `.toHTML()`) deve ser cacheada e processada apenas na primeira solicitação após o `commit()`. Se a AST for alterada ou hidratada, o cache deve ser invalidado.

## Exemplo de Fluxo
```typescript
const calc = CalcAUY.from("(10 + 5) / 3");
const result = calc.commit(2); // Retorna CalcAUYOutput com a AST final e o resultado

// O CalcAUYOutput delega para os processadores
const html = result.toHTML(); // Usa KaTeXProcessor internamente
const audio = result.toVerbalA11y(); // Usa VerbalProcessor internamente
```
