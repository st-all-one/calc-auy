# Customização de Internacionalização (i18n) e A11y

A CalcAUY foi projetada para ser universalmente acessível. O método `toVerbalA11y()` transforma cálculos complexos em narrativas naturais que podem ser consumidas por leitores de tela ou sistemas de voz.

Este guia explica como adicionar suporte a novos idiomas ou sobrescrever comportamentos de verbalização padrão.

## 🌍 Como Funciona o Sistema de Locales

A biblioteca mantém um registro interno de locales suportados (padrão: `pt-BR`, `en-US`, `es-ES`, `fr-FR`, `ja-JP`). Cada locale é definido por um objeto do tipo `CalcAUYLocaleA11y`, que contém:
- Separadores decimais e de milhar.
- Traduções para todos os operadores matemáticos.
- Conectivos e frases estruturais (ex: "multiplicado por", "é igual a").
- Tokens para renderização de diagramas Mermaid.

## 🛠️ Injetando um Locale Customizado

Você pode passar um objeto de locale completo diretamente para o método `toVerbalA11y()`. Isso é útil para dialetos específicos ou idiomas ainda não suportados nativamente.

### Exemplo: Criando um Locale "Pirata" (Apenas para demonstração)

```typescript
const PirateLocale = {
    locale: "en-PIRATE",
    currency: "GLD",
    decimalSeparator: ".",
    voicedSeparator: " points of gold ",
    thousandSeparator: ",",
    operators: {
        add: " plus more booty ",
        sub: " less some plunder ",
        mul: " times the cannons ",
        div: " split among the crew ",
        pow: " to the power of the kraken ",
        group_start: " (avast! ",
        group_end: " ) ",
        // ... outros operadores
    },
    phrases: {
        isEqual: " totals to ",
        rounding: " Ship's rule ",
        for: " for ",
        decimalPlaces: " doubloons "
    },
    // ... tokens mermaid
};

const res = await instance.from(100).add(50).commit();
console.log(res.toVerbalA11y({}, PirateLocale));
// "100 plus more booty 50 totals to 150 points of gold 00 (Ship's rule: NBR-5891 for 2 doubloons)."
```

## 🧪 Estratégia de Tradução Recomendada

Ao implementar um novo idioma, siga estes princípios de **Sensibilidade Didática**:

1.  **Fluidez, não tradução literal:** Em vez de traduzir `add` como "mais", use "somado com" ou "adicionado a" para criar uma frase que flua melhor em leitores de tela.
2.  **Pausas Naturais:** Utilize o campo `voicedSeparator` para incluir espaços extras ou termos que forcem uma entonação correta nos sintetizadores de voz (TTS).
3.  **Consistência de Termos:** Garanta que os termos usados na verbalização coincidam com os termos usados nos logs e diagramas Mermaid para que o auditor e o usuário final falem "a mesma língua".

## 🔗 Veja também
- [**Métodos de Saída**](./output-methods.md): Visão geral de todas as projeções.
- [**Erros de Tipo**](./errors/unsupported-type.md): O que acontece se o locale for malformado.
