# 14 - Internacionalização: Locales e Moedas Padrão

## Objetivo
Definir a matriz de suporte a idiomas e moedas da CalcAUY 2.0, permitindo que a biblioteca resolva automaticamente o símbolo monetário (`currency`) e as regras de tradução verbal a partir do `locale` informado.

## Matriz de Mapeamento Padrão

| Locale | Idioma | Moeda Padrão | Código ISO | Símbolo |
| :--- | :--- | :--- | :--- | :--- |
| **pt-BR** (Default) | Português (Brasil) | Real Brasileiro | `BRL` | `R$` |
| **en-US** | Inglês (EUA) | Dólar Americano | `USD` | `$` |
| **en-EU** | Inglês (Europa) | Euro | `EUR` | `€` |
| **es-ES** | Espanhol (Espanha) | Euro | `EUR` | `€` |
| **fr-FR** | Francês (França) | Euro | `EUR` | `€` |
| **de-DE** | Alemão (Alemanha) | Euro | `EUR` | `€` |
| **ru-RU** | Russo (Rússia) | Rublo Russo | `RUB` | `₽` |
| **zh-CN** | Chinês (Simples) | Yuan Chinês | `CNY` | `¥` |
| **ja-JP** | Japonês (Japão) | Iene Japonês | `JPY` | `¥` |

## Comportamento de Resolução

### 1. Inferência Automática
Se o usuário chamar um método de saída (ex: `toMonetary()`) informando apenas o `locale`, a biblioteca deve consultar esta matriz para determinar a moeda.
- **Exemplo:** `toMonetary({ locale: "en-US" })` -> Formata como USD (`$`).

### 2. Sobrescrita Manual
Se o usuário informar ambos, o `currency` manual tem precedência sobre o padrão do `locale`.
- **Exemplo:** `toMonetary({ locale: "pt-BR", currency: "USD" })` -> Formata em Dólar usando as convenções de milhar/decimal brasileiras (vírgula como separador decimal).

## Regras de Tradução Verbal (A11y) a partir da AST

A tradução verbal deve ser sensível ao `locale` para garantir que a leitura da fórmula seja gramaticalmente correta em cada cultura.

### Exemplos de Tradução de Operadores:

- **pt-BR:** `+` -> "mais", `*` -> "multiplicado por", `/` -> "dividido por".
- **en-US:** `+` -> "plus", `*` -> "multiplied by", `/` -> "divided by".
- **ja-JP:** `+` -> "たす" (tasu), `*` -> "かける" (kakeru), `/` -> "わる" (waru).

### Convenção de Separador Decimal Falado:
- **pt-BR / es-ES / fr-FR / de-DE:** Usa o termo "vírgula".
- **en-US / en-EU:** Usa o termo "point" (ou "decimal").

## Implementação Técnica

### O Objeto de Configuração (LocaleConfig)
```typescript
interface LocaleConfig {
  readonly locale: string;
  readonly defaultCurrency: string;
  readonly decimalSeparator: "." | ",";
  readonly thousandSeparator: "." | "," | " ";
}
```

### Fallback Global
Caso um `locale` não suportado seja informado, a biblioteca deve:
1. Tentar o fallback para o idioma base (ex: `es-MX` -> `es-ES`).
2. Se falhar, utilizar o padrão global: **pt-BR / BRL**.

## Integração com a AST
Durante a geração do `toVerbalA11y()`, o `VerbalProcessor` deve percorrer a AST e substituir os tokens de operação pelos termos equivalentes do dicionário do `locale` ativo, garantindo que o rastro de auditoria falado seja natural e preciso.
