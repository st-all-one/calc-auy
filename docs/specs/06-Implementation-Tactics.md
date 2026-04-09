# 06 - Táticas de Implementação e Segurança

## Objetivo
Garantir a integridade da biblioteca através de padrões de codificação rigorosos, aproveitando os recursos modernos do TypeScript e JavaScript para proteger o estado interno e manter o código manutenível na CalcAUY.

## Restrições de Runtime (Hard Privacy)
Diferente da versão anterior, a nova CalcAUY deve utilizar campos privados reais do JavaScript (`#`) em conjunto com os modificadores do TypeScript:
- **Campos do Motor:** Usar `#` para garantir que o estado interno da AST e do `RationalNumber` seja inacessível mesmo após a compilação/transpilação para JavaScript puro.
- **Campos de Configuração:** Usar `private readonly` para valores que não precisam de proteção de runtime mas devem ser protegidos em tempo de compilação.

## Imutabilidade por Padrão
Nenhuma instância de `CalcAUY` ou `RationalNumber` deve permitir alterações em seu estado após a criação.
- **Factory Methods:** Utilizar o padrão de métodos estáticos de fábrica (`.from()`) para instanciar objetos. O construtor deve ser `private`.
- **Clonagem Estrutural:** Ao realizar uma operação, uma nova instância deve ser retornada, contendo a nova AST expandida.

## Gerenciamento de Dependências
A biblioteca deve manter-se ultra-leve, possuindo como única dependência o **LogTape 2.0** para auditoria de telemetria estruturada.
- **Inversão de Dependência:** O KaTeX e outros renderizadores externos devem ser injetados ou configurados como plugins, evitando que a CalcAUY os tenha em seu `package.json` / `deno.jsonc` como dependências diretas pesadas.

## Rigor de Tipagem
- **Branded Types:** Se possível, utilizar "Branded Types" para distinguir entre diferentes unidades de medida ou tipos de números se o projeto crescer (ex: `CurrencyAmount`, `UnitValue`).
- **No Any:** O uso de `any` é terminantemente proibido. Devem ser utilizadas interfaces genéricas ou uniões de tipos literais.
- **Checklists de A11y:** Durante a implementação, seguir as diretrizes de acessibilidade matemática definidas em `.agents/guidelines/`.
