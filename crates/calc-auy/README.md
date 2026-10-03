# `calc-auy` — CLI

Binário oficial do CalcAUY: casca fina sobre `calc-auy-api`.

## Convenção

- O **único argumento posicional é o `BODY`**; ausente (ou `-`) lê da
  **entrada padrão** (funciona com heredoc e pipe).
- A saída vai para **stdout**; erros legíveis para **stderr**.
- Toda a configuração vai em **`--params '{...}'`** (JSON). `--params` e
  `--batch` são **mutuamente exclusivos** e não convivem com outras flags.
- **`format` é o padrão**: `calc-auy "1+2"`.
- Operações explícitas via `--params '{"op":"commit"|"sign"|"format"}'`.
- Subcomandos explícitos: `verify`, `hydrate`, `repl`, `schema`, `man`, `help`.

## Uso

```sh
calc-auy "10000 * (1 + 14.75%) ^ 3"                     # 15109.78
calc-auy <<'EOF'
10000 * (1 + 14.75%) ^ 3
EOF

# configuração completa em --params
calc-auy --params '{"mode":"monetary"}' "10000 * (1 + 14.75%) ^ 3"
calc-auy --params '{"op":"commit"}' "1 + 2"             # traço de auditoria
calc-auy --params '{"op":"sign"}' "1 + 2"               # assinatura hex
calc-auy --params '{"op":"format","mode":"latex","decimals":4}' "1/3"
calc-auy --params '{"mode":"json"}' "1 + 2"                # múltiplas representações
calc-auy --params '{"mode":"html"}' "1/2 + 3"            # fragmento KaTeX
calc-auy --params '{"mode":"svg"}' "1/2 + 3"             # documento SVG

# subcomandos tangenciais
calc-auy verify "$(calc-auy --params '{"op":"commit"}' '1 + 2')"   # true
calc-auy hydrate "$(calc-auy --params '{"op":"commit"}' '1 + 2' | jq .payload.ast)"
calc-auy repl
calc-auy schema
calc-auy man > /usr/local/share/man/man1/calc-auy.1
calc-auy man --completions bash > /etc/bash_completion.d/calc-auy
```

## `--params`

Todos os campos são opcionais:

| Campo | Valores | Padrão |
|-------|---------|--------|
| `op` | `format`, `commit`, `sign` | `format` |
| `salt` | string | `calc-auy` |
| `decimals` | inteiro | `2` |
| `rounding` | `nbr5891`, `half_up`, `half_even`, `truncate`, `ceil`, `none` | `nbr5891` |
| `locale` | `pt-BR`, `en-US`, `en-EU`, `fr-FR`, `de-DE`, `es-ES`, `ru-RU`, `zh-CN`, `ja-JP` | `pt-BR` |
| `mode` | `decimal`, `monetary`, `latex`, `unicode`, `mermaid`, `scaled`, `verbal`, `json`, `html`, `svg` | `decimal` |
| `error_format` | `human`, `json` | `human` |
| `deterministic` | booleano | `false` |

Campos desconhecidos são rejeitados (exit 2). Variáveis de ambiente
(`CALC_AUY_SALT`, `CALC_AUY_DECIMALS`, `CALC_AUY_ROUNDING`, `CALC_AUY_LOCALE`,
`CALC_AUY_CONFIG`) servem de fallback: **`--params` > ambiente > arquivo >
padrões**. O arquivo (`CALC_AUY_CONFIG`) usa o formato `chave = valor`.

## Lote (`--batch`)

Cada linha da entrada é `{"id"?, "body", "params"?}` e a resposta é
`{"id", "ok", ...}`, **na mesma ordem** e com memória limitada:

```sh
printf '%s\n' \
  '{"id":1,"body":"1+1"}' \
  '{"id":2,"body":"1/0"}' \
  '{"id":3,"body":"10000*(1+14.75%)^3","params":{"mode":"monetary"}}' \
  | calc-auy --batch
```

```json
{"id":1,"ok":true,"result":"2.00"}
{"id":2,"ok":false,"problem":{...RFC 7807...}}
{"id":3,"ok":true,"result":"R$ 15.109,78"}
```

- O `params` por item é aplicado sobre a configuração base (ambiente/padrões).
- `CALC_AUY_BATCH_BUFFER` ajusta o canal limitado (padrão 256).
- Pool `rayon`; ordem garantida pelo coletor.

## Erros e códigos de saída

`0` ok · `1` genérico/IO · `2` uso/params · `3` parse · `4` limite/overflow ·
`5` divisão por zero · `6` integridade/custódia · `7` irracional.

Com `--params '{"error_format":"json"}'`, o erro vira um `ProblemDetails`
(RFC 7807) no `stdout`.
