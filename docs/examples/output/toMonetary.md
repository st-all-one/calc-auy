# Método: `.toMonetary()`

Gera uma representação monetária formatada e localizada, garantindo que o símbolo da moeda e os separadores estejam corretos para cada país.

## Assinatura
```ts
public toMonetary(options?: OutputOptions): string
```

## Exemplos de Uso

### 1. Padrão Brasileiro (pt-BR / BRL)
```ts
const brl = output.toMonetary({ locale: "pt-BR", decimalPrecision: 2 });
// "R$ 1.250,50"
```

### 2. Dólar Americano (en-US / USD)
```ts
const usd = output.toMonetary({ locale: "en-US", currency: "USD", decimalPrecision: 2 });
// "$1,250.50"
```

### 3. Euro com Locale Francês
```ts
const eur = output.toMonetary({ locale: "fr-FR", currency: "EUR" });
// "1 250,50 €"
```

## Diferenciais
- **Inferência de Moeda:** Se você passar apenas o `locale`, a CalcAUY resolve a moeda padrão automaticamente (ex: `pt-BR` -> `BRL`).
- **Rigor de Separadores:** Utiliza a API `Intl.NumberFormat` para garantir que as regras culturais de formatação sejam respeitadas.
