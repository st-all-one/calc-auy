# Representações visuais e JSON

Além dos formatos textuais (decimal, monetário, LaTeX, Unicode, Mermaid), o
CalcAUY oferece representações **visuais** e uma representação **JSON
multi-formato**. Todas derivam do mesmo LaTeX canônico de
`Output::to_latex`, garantindo fidelidade entre canais.

## HTML (`KaTeX`)

`calc-auy-render::to_html` renderiza o LaTeX com o motor `KaTeX` e injeta o CSS
minificado (fontes em *data URI*) no próprio fragmento, produzindo uma saída
**auto-contida** e acessível (`aria-label` com a descrição verbal):

```rust
use calc_auy_output::{HtmlOptions, Output, OutputOptions};
use calc_auy_i18n::PtBrRealizer;

let html = output.to_html(&PtBrRealizer::new(), &HtmlOptions::default())?;
```

## SVG e PNG

`to_svg` e `to_png` usam o motor `latex-rust` (layout em racionais exatos):

```rust
use calc_auy_output::{PngOptions, SvgOptions};

let svg = output.to_svg(&SvgOptions::default())?;
let png = output.to_png(&PngOptions::new())?;
```

A rasterização PNG é opcional (feature `png`, ligada por padrão).

## JSON multi-formato

`Output::to_json_formats` seleciona um subconjunto de representações e as
serializa em um objeto estável, acrescentando `signature` e, quando presente,
`contextLabel`:

```rust
use calc_auy_output::{DEFAULT_KEYS, Output};

let json = output.to_json_formats(DEFAULT_KEYS, &realizer)?;
```

As chaves disponíveis são `decimal`, `scaled`, `monetary`, `latex`, `unicode`,
`mermaid` e `verbal`.

## Features

- `calc-auy-output/render` — habilita HTML, SVG e PNG (puxa `calc-auy-render`).
- `calc-auy-render/png` — habilita a rasterização PNG.
- `calc-auy-render/instrument` — spans/eventos estruturados (`diag`).

A CLI habilita `render` por padrão (`--params '{"mode":"html"|"svg"|"json"}'`).
