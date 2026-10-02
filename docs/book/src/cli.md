# CLI `calc-auy`

Convenção: o **único argumento posicional é o `BODY`** (padrão: stdin, aceita
heredoc); toda configuração vai em `--params='{...}'`; a saída vai para stdout.

```console
$ calc-auy "1 + 2"
3.00

$ calc-auy --params '{"mode":"monetary","locale":"pt-BR"}' "10000 * (1 + 14.75%) ^ 3"
R$ 15.109,78

$ echo "1/3" | calc-auy --params '{"rounding":"half_up","decimals":4}'
0.3333
```

## Parâmetros

| Campo | Valores | Padrão |
|-------|---------|--------|
| `op` | `format`, `commit`, `sign` | `format` |
| `decimals` | inteiro | `2` |
| `rounding` | `nbr5891`, `half_up`, `half_even`, `truncate`, `ceil`, `none` | `nbr5891` |
| `locale` | `pt-BR`, `en-US`, `en-EU`, `fr-FR`, `de-DE`, `es-ES`, `ru-RU`, `zh-CN`, `ja-JP` | `pt-BR` |
| `mode` | `decimal`, `monetary`, `latex`, `unicode`, `mermaid`, `scaled`, `verbal` | `decimal` |
| `error_format` | `human`, `json` | `human` |
| `deterministic` | booleano | `false` |

Subcomandos: `verify`, `hydrate`, `repl`, `schema`, `man`, `help`.

## Lote

`--batch` lê NDJSON (`{"id"?, "body", "params"?}`) e devolve NDJSON na mesma
ordem, em paralelo, com `CALC_AUY_BATCH_BUFFER` (padrão 256).
