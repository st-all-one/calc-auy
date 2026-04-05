# Auditoria Técnica: internal/parser.ts

## Propósito
O arquivo `parser.ts` é o portal de entrada de dados da biblioteca. Sua responsabilidade é validar e converter strings numéricas (decimais, frações, notação científica ou BigInt literais) para a representação interna escalada de 10^12.

## Implementação Técnica
- **Regex Strict Enforcement:** Define padrões rígidos para cada formato numérico, impedindo a entrada de lixo ou caracteres ambíguos.
- **parseFractionLiteral:** Converte frações (ex: "1/3") diretamente para BigInt escalonado. Diferente de converter `1/3` para float e depois escalar, esta função realiza a divisão após multiplicar o numerador pelo fator de escala, preservando a máxima precisão possível e aplicando arredondamento Half-Up na 12ª casa decimal.
- **parseScientificLiteral:** Trata a notação `eX` ajustando o expoente em relação à precisão interna. Se o resultado for uma potência negativa de 10, realiza divisão com arredondamento manual ("Half Away From Zero") para garantir que não haja perda silenciosa de dados.
- **Underscore Support:** Suporta separadores de milhar via sublinhado (`_`), conforme o padrão do JavaScript moderno (ex: `1_000.50`).

## Onde/Como é usado
- **src/main.ts:** Chamado via método estático `CalcAUD.from(string)`.

## Padrões de Design
- **Lexical Parser:** Analisa a estrutura da string antes de realizar a conversão.
- **Chain of Responsibility (Simples):** Testa sequencialmente múltiplos formatos (`RE_BIGINT`, `RE_FRACTION`, `RE_SCIENTIFIC`, `RE_DECIMAL`) até encontrar o processador adequado.

## Observações de Auditor Sênior
- **Segurança:** O parser rejeita tipos como `Infinity` ou `NaN` que seriam problemáticos em cálculos posteriores.
- **Precisão:** Ao tratar frações como operações de escala imediata, o CalcAUD evita os problemas clássicos de dízimas periódicas em floats.
- **Robustez:** A reutilização da lógica científica para o parser decimal (`parseScientificLiteral(value + "e0")`) reduz a duplicação de código e simplifica a manutenção da lógica de arredondamento de entrada.
