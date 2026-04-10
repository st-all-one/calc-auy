# Método: `.toUnicode()`

Gera uma representação matemática utilizando glifos Unicode especiais (sobrescritos e subscritos). Ideal para logs, terminais (CLI) e mensagens de texto puro (Slack, Discord).

## Assinatura
```ts
public toUnicode(options?: OutputOptions): string
```

## Exemplos de Uso

### 1. Visualização em Terminal
```ts
const calc = CalcAUY.from(2).pow(3).add(5).commit();
console.log(calc.toUnicode()); 
// "roundₙᵦᵣ(2³ + 5, 4) = 13.0000"
```

### 2. Notificações de Bot
```ts
const msg = `Cálculo concluído: ${output.toUnicode({ decimalPrecision: 2 })}`;
await bot.sendMessage(msg);
```

## Diferenciais
- **Leveza:** Não exige renderizadores gráficos (KaTeX/HTML) para ser legível.
- **Modernidade:** Utiliza mapeamentos Unicode avançados (incluindo Unicode 17.0) para representar potências, raízes e identificadores de arredondamento.
