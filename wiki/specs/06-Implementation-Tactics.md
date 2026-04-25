# 06 - Táticas de Implementação e Segurança

```mermaid
flowchart TD
    subgraph InstanceA [Instance 1]
        V1["#ast (Root)"]
    end
    
    InstanceA --> Op["op: .add(5)"]
    Op --> InstanceB [Instance 2]
    
    subgraph InstanceB
        V2["#ast (New Root)"]
    end
    
    style V1 fill:#f8bbd0,stroke:#880e4f
    style V2 fill:#c8e6c9,stroke:#2e7d32
```

## Objetivo
Garantir a integridade da biblioteca através de padrões de codificação rigorosos, aproveitando os recursos modernos do TypeScript e JavaScript para proteger o estado interno e manter o código manutenível na CalcAUY.

## Restrições de Runtime (Hard Privacy)
A CalcAUY utiliza obrigatoriamente campos privados reais do JavaScript (`#`) em substituição ao modificador `private` convencional do TypeScript para todos os membros internos críticos:
- **Campos do Motor:** O estado da AST, o valor do `RationalNumber` e todos os caches de rastro (LaTeX, Unicode, etc.) devem usar `#` para garantir isolamento total em runtime.
- **Membros Estáticos:** Caches globais (como o de formatadores de moeda e CSS do KaTeX) e utilitários como o `TextEncoder` também devem ser privados nativos (`static #`).

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
