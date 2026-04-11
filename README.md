<div align="center">

# CalcAUY

**Infraestrutura de Cálculo AST para Engenharia Financeira e Acessibilidade Digital**

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-2b3a42?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0)
[![JSR](https://img.shields.io/badge/JSR-F7DF1E?style=for-the-badge&logo=jsr&logoColor=000)](https://jsr.io/@seu-escopo/seu-pacote)
[![Made in Brazil](https://img.shields.io/badge/Made_in-Brazil-009739?style=for-the-badge)](https://github.com/topics/brazil)

</div>

A **CalcAUY** é uma infraestrutura em **TypeScript** projetada para neutralizar a imprecisão do padrão IEEE 754. Através de **imutabilidade estrita e Árvore de Sintaxe Abstrata (AST)**, ela assegura a integridade atuária, transformando cada operação em uma evidência matemática transparente, acessível e auditável.

---

## 📖 Documentação

- [Entendendo a CalcAUY](./docs/start.md)
- [Exemplos de uso](./docs/examples.md)
- [Especificações](./docs/specs.md)
- [Segurança e Auditabilidade](./docs/audit.md)

## 🚀 Quick-start

### Instalação:
```bash
deno    add jsr:@st-all-one/calc-auy
pnpm      i jsr:@st-all-one/calc-auy
yarn    add jsr:@st-all-one/calc-auy
vlt install jsr:@st-all-one/calc-auy
npx     jsr add @st-all-one/calc-auy
bunx    jsr add @st-all-one/calc-auy
```

### Execução:
```ts
import { CalcAUY } from "@st-all-one/calc-auy";

// ==== Cálculo de Juros Compostos M = C * (1 + i)^t ====
// Parâmetros
const capital = CalcAUY.from("1000.00");
const taxaAnual = CalcAUY.from("0.10"); // 10% a.a.
const anosDecorridos = 3;

// Cálculo matemático M = C * (1 + i)^t
const calcMontante = capital.mult(
    CalcAUY.from(1)
        .add(taxaAnual)
        .group()
        .pow(anosDecorridos),
);

// Colapso da AST ==> realização do cálculo
const resultado = calcMontante.commit({ roundStrategy: "NBR5891" });

// Diferentes visualizaçõe do resultado
const monetario = resultado.toMonetary();
const scaledBigInt = resultado.toScaledBigInt({ decimalPrecision: 2 });
const unicode = resultado.toUnicode();
const latex = resultado.toLaTeX();
const verbalA11y = resultado.toVerbalA11y({ locale: "fr-FR" });
const auditTrace = resultado.toAuditTrace();

console.log(monetario);     // "R$ 1.331,0000"
console.log(scaledBigInt); // 133100n

console.log(unicode);       // "roundₙᵦᵣ₋₅₈₉₁(1000.00 × ((1 + (0.10))³), 4) = 1331.0000"
console.log(latex);         // "\text{round}_{\text{NBR-5891}}(1000.00 \times \left( \left( 1 + \left( 0.10 \right) \right)^{3} \right), 4) = 1331.0000"

console.log(verbalA11y);    // "1000.00 multiplié par ouvrir la parenthèse ouvrir la parenthèse 1 plus ouvrir la parenthèse 0.10 fermer la parenthèse fermer la parenthèse puissance 3 fermer la parenthèse est égal à 1331 virgule 0000 (Arrondi: NBR-5891 pour 4 décimales)."

console.log(auditTrace);
/*
{"ast":{"kind":"operation","type":"mul","operands":[{"kind":"literal","value":{"n":"1000","d":"1"},"originalInput":"1000.00"},{"kind":"group","child":{"kind":"operation","type":"pow","operands":[{"kind":"group","child":{"kind":"operation","type":"add","operands":[{"kind":"literal","value":{"n":"1","d":"1"},"originalInput":"1"},{"kind":"group","child":{"kind":"literal","value":{"n":"1","d":"10"},"originalInput":"0.10"}}]}},{"kind":"literal","value":{"n":"3","d":"1"},"originalInput":"3"}]}}]},"finalResult":{"n":"1331","d":"1"},"strategy":"NBR5891"}
*/
```

### Showcase

Veja em execução no [Showcase Interativo](https://google.com)

## 🎯 Por que a CalcAUY existe?

No desenvolvimento de softwares modernos, o uso do padrão **IEEE 754** (number/float) introduz um risco sistêmico. Erros de arredondamento binário, como o clássico `0.1 + 0.2 !== 0.3`, não são meras curiosidades matemáticas; em escala, transformam-se em rombos financeiros, falhas de compliance e passivos jurídicos.

A `CalcAUY` busca neutralizar essa imprecisão ao tratar o cálculo como um **artefato de engenharia persistente e auditável**.

### Engenharia Matemática

- **Precisão Racional**: Baseada em `BigInts`, a lib opera puramente com frações exatas `(n/d)`. Executando simplificação via **Algoritmo de Euclides** (MCD) em cada etapa, garantindo que a memória seja otimizada sem sacrificar o rigor matemático.

- **Precedência Rigorosa**: Implementa o padrão `PEMDAS/BODMAS`, tratando a exponenciação com **Associatividade à Direita** e garantindo que o agrupamento léxico proteja a ordem das operações conforme a intenção do cálculo.

- **Auditabilidade Forense via AST**: Toda operação constrói uma `Árvore de Sintaxe Abstrata (AST) imutável`. Isso permite "hibernar" cálculos complexos em JSON e reidratá-los sem perda de contexto, preservando a intenção original do cálculo.

- **Segurança por Design**: Opera sob o dogma de `Security by Default`, com redação automática de dados sensíveis (`PII`) em logs estruturados. A engine é protegida por gatekeepers estruturais que validam **estritamente** cada input, neutralizando vetores de ataque como `JSON Bombs` e `Stack Overflow`.

- **Integridade Atuária**: Implementação estrita da `NBR 5891` e algoritmos de `Resto de divisão Euclidiana` e `Maior Resto` para rateios monetários exatos, garantindo que nenhum centavo seja perdido ou tendenciado.

### Developer Experience (DX), Portabilidade e Escalabilidade

- **Tipagem Estrita**: Desenvolvida sob o `Strict Mode máximo` do TypeScript, a lib utiliza `Type Guards` e campos privados para garantir que a integridade dos dados seja mantida do código à transpilação.

- **Agnosticismo de Runtime**: Distribuída via `JSR`, a biblioteca é nativamente compatível com `Deno`, `Node.js`, `Bun` e `Cloudflare Workers`. Sem dependências pesadas, ela mantém um rastro zero de IO, operando puramente em memória.

- **Interoperabilidade Total**: Através do sistema de `Custom Output Processors`, a lib é extensível para suportar qualquer formato de saída (Protobuf, XML, Excel) sem inflar o núcleo do projeto.

- **Processamento em Lotes**: O utilitário `processBatch` permite processar volumes massivos de transações (ex: 100.000 cálculos) sem congelar o servidor, utilizando a API `scheduler.yield()` para equilibrar o Throughput e a Responsividade.

### Acessibilidade (A11y) e Universalidade

- **Matemática Acessível**: A `CalcAUY` transforma a AST em diferentes representações visuais e integrativas, como narrações verbais em 8 idiomas (`toVerbalA11y`), unicode para CLIs (`toUnicode`), LaTeX para relatórios (`toLaTeX`), HTML via KaTeX (`toHTML`), AST serializada para auditoria profunda (`toAuditTrace`) e diversos outros outputs, garantindo que cada cálculo possa ser lido por pessoas, máquinas e leitores de tela.

## 🔍 Testes

**📊 Code Coverage**
> ```bash
> // 2026-04-10
> ❯ deno task coverage:dev
>
> ok | 16 passed (215 steps) | 0 failed (12s)
>
> | File                               | Branch % | Function % | Line % |
> | ---------------------------------- | -------- | ---------- | ------ |
> | mod.ts                             |    100.0 |      100.0 |  100.0 |
> | src/ast/builder_utils.ts           |     95.2 |      100.0 |   88.2 |
> | src/ast/engine.ts                  |     97.6 |      100.0 |   97.7 |
> | src/builder.ts                     |     94.1 |      100.0 |   95.4 |
> | src/core/constants.ts              |    100.0 |      100.0 |  100.0 |
> | src/core/errors.ts                 |    100.0 |      100.0 |  100.0 |
> | src/core/metadata.ts               |    100.0 |      100.0 |  100.0 |
> | src/core/rational.ts               |     92.4 |      100.0 |   96.8 |
> | src/i18n/i18n.ts                   |     50.0 |      100.0 |  100.0 |
> | src/output.ts                      |     93.0 |      100.0 |   98.2 |
> | src/output_internal/image_utils.ts |     75.0 |      100.0 |   96.6 |
> | src/output_internal/renderer.ts    |     93.1 |      100.0 |   82.5 |
> | src/output_internal/slicer.ts      |     69.2 |      100.0 |   87.8 |
> | src/parser/lexer.ts                |     83.7 |      100.0 |   81.8 |
> | src/parser/parser.ts               |     90.2 |      100.0 |   93.6 |
> | src/rounding/rounding.ts           |     86.2 |      100.0 |   87.3 |
> | src/utils/batch.ts                 |     77.8 |      100.0 |   88.5 |
> | src/utils/logger.ts                |    100.0 |      100.0 |  100.0 |
> | src/utils/sanitizer.ts             |     98.6 |      100.0 |   98.9 |
> | src/utils/unicode.ts               |     75.0 |      100.0 |  100.0 |
> | All files                          |     92.3 |      100.0 |   95.0 |
> ```

**🛡️ Code Quality (SonarQube)**
> IMG
>
> Link, 2026-04-xx

**📛 Stress Test**
> ```bash
> // 2026-04-10
> ❯ deno test tests/stress.test.ts
> ┌───────────────────────────────┬─────────────────────────────────────────┐
> │ (idx)                         │ Values                                  │
> ├───────────────────────────────┼─────────────────────────────────────────┤
> │ 1_cpu_limit_complex_root      │ "5.3429ms"                              │
> │ 2_extensive_ast_depth         │ "1.8433ms"                              │
> │ 3_costly_repeated_pow         │ "718.7615ms (iterations: 100000)"       │
> │ 4_simple_real_repeated        │ "257.6571ms (iterations: 100000)"       │
> │ 5_metadata_cloning_stress     │ "70.0454ms (metadata_keys: 1000)"       │
> │ 6_rational_explosion_gcd      │ "0.2047ms"                              │
> │ 7_slicing_massacre            │ "39.2240ms (slices: 100000)"            │
> │ 8_burst_concurrency_ddos      │ "546.0134ms (concurrent_tasks: 100000)" │
> │ 9_batch_processing_controlled │ "525.6754ms (total_tasks: 100000)"      │
> │ 10_logging_policy_race_stress │ "16.5213ms (errors: 0)"                 │
> │ 11_bigint_limit_torture       │ "0.7574ms (caught_overflow: true)"      │
> │ 12_malicious_json_hydration   │ "1.2569ms (deflected: true)"            │
> └───────────────────────────────┴─────────────────────────────────────────┘
>
> ❯ deno test tests/output_stress.test.ts
> ┌────────────────────────────┬────────────────────────────────┐
> │ (idx)                      │ Values                         │
> ├────────────────────────────┼────────────────────────────────┤
> │ 1_monetary_cache_hit_rate  │ "147.2271ms (iters: 100000)"   │
> │ 2_verbal_a11y_deep_ast     │ "0.6755ms (chars: 9079)"       │
> │ 3_render_complexity_nested │ "1.4826ms (latex_len: 4395)"   │
> │ 4_html_generation_burst    │ "201.1733ms (iters: 100000)"   │
> │ 5_high_precision_slicing   │ "59.2784ms (slices: 100000)"   │
> │ 6_to_json_consolidation    │ "809.4350ms (iters: 100000)"   │
> │ 7_locale_switching_burst   │ "172.1136ms (switches: 90000)" │
> │ 8_custom_processor_stress  │ "292.1440ms (iters: 100000)"   │
> │ 9_image_buffer_svg_stress  │ "1147.7605ms (iters: 100000)"  │
> └────────────────────────────┴────────────────────────────────┘
> ```

<details>
<summary><b>🔍 Detalhes do Hardware </b></summary>

```bash
❯ deno --version
deno 2.7.7 (stable, release, x86_64-unknown-linux-gnu)
v8 14.6.202.9-rusty
typescript 5.9.2

❯ inxi -Fzx
System:
  Kernel: 6.19.11-200.fc43.x86_64 arch: x86_64 bits: 64 compiler: gcc
    v: 15.2.1
  Desktop: GNOME v: 49.5 Distro: Fedora Linux 43 (Workstation Edition)
Machine:
  Type: Laptop System: LENOVO product: 83MM v: IdeaPad Slim 3 15ARP10
  Mobo: LENOVO model: LNVNB161216
    Firmware: UEFI vendor: LENOVO
CPU:
  Info: 8-core model: AMD Ryzen 7 7735HS with Radeon Graphics bits: 64
    type: MT MCP arch: Zen 3+ rev: 1 cache: L1: 512 KiB L2: 4 MiB L3: 16 MiB
  Speed (MHz): avg: 3115 min/max: 407/4831 boost: enabled cores: 1: 3115
    2: 3115 3: 3115 4: 3115 5: 3115 6: 3115 7: 3115 8: 3115 9: 3115 10: 3115
    11: 3115 12: 3115 13: 3115 14: 3115 15: 3115 16: 3115 bogomips: 102200
  Flags-basic: avx avx2 ht lm nx pae sse sse2 sse3 sse4_1 sse4_2 sse4a
    ssse3 svm
Graphics:
  Device-1: Advanced Micro Devices [AMD/ATI] Rembrandt [Radeon 680M]
    vendor: Lenovo driver: amdgpu v: kernel arch: RDNA-2 bus-ID: 04:00.0
    temp: 44.0 C
  Display: wayland server: X.Org v: 24.1.9 with: Xwayland v: 24.1.9
    compositor: gnome-shell driver: dri: radeonsi
  API: OpenGL v: 4.6 vendor: amd mesa v: 25.3.6 glx-v: 1.4
    direct-render: yes renderer: AMD Radeon 680M (radeonsi rembrandt LLVM
    21.1.8 DRM 3.64 6.19.11-200.fc43.x86_64)
  Info: Tools: api: glxinfo x11: xdriinfo, xdpyinfo, xprop, xrandr
Drives:
  ID-1: /dev/nvme0n1 vendor: Western Digital model: WD PC SN5000S
Partition:
  ID-1: / size: 474.34 GiB fs: btrfs dev: /dev/dm-0
Info:
  Memory: total: 8 GiB
  Processes: 517 Uptime: 20m Init: systemd
  Packages: gcc: 15.2.1 Shell: Zsh v: 5.9
    inxi: 3.3.40
```
</details>

---

<div align="center">

**A CalcAUY é a ferramenta para o engenheiro que não aceita resultados sem provas auditáveis**

---

-- Este projeto é Open Source e Licenciado através da **Mozilla Public License v2.0** --

</div>
