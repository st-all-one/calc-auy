# Método: `.toVerbalA11y()`

Gera a tradução verbal (fonética) do rastro de cálculo. É a base da **Acessibilidade Universal** da biblioteca.

## Assinatura
```ts
public toVerbalA11y(options?: OutputOptions): string
```

## Exemplos de Uso

### 1. Português Brasil (pt-BR)
```ts
const voz = output.toVerbalA11y({ locale: "pt-BR" });
// "dez mais cinco é igual a quinze vírgula zero zero..."
```

### 2. Inglês (en-US)
```ts
const voice = output.toVerbalA11y({ locale: "en-US" });
// "ten plus five is equal to fifteen point zero zero..."
```

## Por que usar?
- **Inclusão:** Permite que deficientes visuais compreendam não apenas o resultado, mas a fórmula que o gerou.
- **Interfaces de Voz:** Perfeito para integração com Alexa, Siri ou assistentes de voz em apps bancários.
- **Rigor:** Detecta automaticamente o início e fim de grupos (parênteses) para garantir que a leitura respeite a hierarquia das operações.
