# calc-auy-i18n — Realizadores linguísticos (NLG)

Camada de **realização linguística** (não tradução chave-valor) do CalcAUY.
Recebe a SRL (`calc-auy-nlg`) e produz linguagem natural adaptada a ordem,
concordância, gênero e script de cada idioma (ADR-011).

## Idiomas

| Código | Realizer | Particularidades |
|--------|----------|------------------|
| `pt-BR` | `PtBrRealizer` | grupos de 3, "cem"/"cento", `mil` sem "um" |
| `en-US` | `EnUsRealizer` | grupos de 3, sem "and" |
| `en-EU` | `EnEuRealizer` | grupos de 3, com "and" |
| `es-ES` | `EsEsRealizer` | `veintiuno`, `cien`/`ciento` |
| `fr-FR` | `FrFrRealizer` | 70/80/90 irregulares (`soixante-dix`, `quatre-vingts`) |
| `de-DE` | `DeDeRealizer` | compostos (`einundzwanzig`) |
| `ru-RU` | `RuRuRealizer` | concordância de plural (`тысяча`/`тысячи`/`тысяч`) |
| `zh-CN` | `ZhCnRealizer` | grupos de **4** dígitos (`万`/`亿`) |
| `ja-JP` | `JaJpRealizer` | grupos de **4** dígitos (`万`/`億`) |

## Uso

```rust
use calc_auy_i18n::{realizer_for_code, Language};

let realizer = realizer_for_code("pt-BR");
// `realizer.realize(&srl)` → "dez mil ... é igual a ...".
# let _ = realizer;
```

## Estendendo um idioma

A gramática é **código**; o léxico é **dado**. Para adicionar um idioma:

1. **Léxico** — defina um `NumberWords` (unidades, dezenas, centenas, escalas,
   junturas) ou, se a numeração for irregular, uma função de escrita numérica
   dedicada.
2. **Gramática** — monte um `Grammar` com a função numérica, os `Connectors` de
   cada operação e os delimitadores de agrupamento.
3. **Realizer** — implemente `VerbalRealizer::realize`, formatando a sentença
   (a ordem pode mudar livremente) e `language`.

```rust
use calc_auy_i18n::{grammar, Language};
use calc_auy_nlg::{Gender, SrlNode};

let grammar = grammar(Language::PtBr);
let expression = grammar.render_node(&SrlNode::Literal("42".to_string()), Gender::Masculine);
assert_eq!(expression, "quarenta e dois");
```

Depois, registre o idioma em `Language` (código, `realizer`, `grammar`). Os
testes de acessibilidade (`tests/realizers.rs`) verificam que nenhum literal ou
operação é perdido na realização.
