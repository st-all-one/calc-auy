# 15 - Rigor de Código e Performance

Esta especificação define os limites técnicos e de qualidade impostos pela configuração do projeto (`deno.jsonc`), garantindo que o código seja previsível, seguro e performático em qualquer ambiente.

## 1. Rigor de Tipagem (TypeScript Strict)

O projeto opera em modo **Strict Máximo**. Regras obrigatórias:
- **`noImplicitAny: true`**: Proibido o uso de tipos implícitos `any`. Cada valor deve ter uma definição clara.
- **`strictNullChecks: true`**: Garantia de que `null` e `undefined` sejam tratados explicitamente, eliminando erros de "null pointer".
- **`explicit-function-return-type`**: Todas as funções (especialmente as públicas) **devem** declarar seu tipo de retorno explicitamente.
- **`explicit-module-boundary-types`**: Exportações de módulos devem ter tipos claros para facilitar o consumo por terceiros e a geração de documentação.

## 2. Padrões de Qualidade e Segurança (Lint)

O linter está configurado para prevenir padrões de código perigosos ou ambíguos:
- **Proibição de `eval()`**: Jamais utilizar `eval` ou construtores de função dinâmicos.
- **Proibição de `console.log`**: O rastro de execução deve ser feito via **LogTape 2.0**.
- **`verbatim-module-syntax`**: Garante que os imports/exports sejam compatíveis com sistemas de módulos modernos e ESM puro.
- **Igualdade Estrita**: Uso obrigatório de `===` e `!==` (regra `eqeqeq`).

## 3. Performance e Compatibilidade de Runtime

### Portabilidade Browser/Front-end
- **Libs Disponíveis:** O projeto inclui `dom`, `dom.iterable` e `dom.asynciterable` nas `compilerOptions`. Isso garante que a CalcAUY possa manipular estruturas necessárias para renderização de imagem/HTML e funcionar perfeitamente em navegadores modernos.
- **Agnosticismo de IO:** O core da biblioteca não deve depender de APIs específicas de sistema operacional (como `Deno.readFile` ou `fs.readFileSync`) para manter sua natureza "run-anywhere".

### Otimização de Performance Extrema
1. **Instance-Level Caching (Memoization):** Todas as transformações custosas (LaTeX, HTML, Unicode, ImageBuffer) são cacheadas na instância do `CalcAUYOutput`. Chamadas subsequentes possuem custo O(1).
2. **GCD Híbrido:** Substituição do algoritmo de Euclides puro por uma abordagem híbrida que utiliza o operador `%` nativo do V8 (C++) e fast-paths para números pequenos, otimizando a simplificação de frações.
3. **Hard Privacy (#):** Uso de campos privados nativos reduz a superfície de ataque e melhora a performance de acesso interno em relação a fechamentos (closures).

## 4. Governança de Testes e Cobertura

- **Padrão BDD:** Uso obrigatório de `@std/testing` e `@std/assert`.
- **Cobertura (Coverage):** O objetivo é manter a cobertura de código o mais próximo possível de 100%. Testes de mutação ou casos de borda (edge cases) matemáticos são prioridade.
- **Relatórios:** Cobertura deve ser gerada via `deno task coverage` para auditoria de CI/CD.

## 5. Formatação Identitária

O código deve seguir rigorosamente o `deno fmt`:
- **Largura de Linha:** 120 caracteres.
- **Indentação:** 4 espaços (não tabs).
- **Semicolons:** Obrigatórios.
- **Braces:** Sempre na mesma linha (`sameLine`).
