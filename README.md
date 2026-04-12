<div align="center">

# CalcAUY

**Infraestrutura de Cálculo AST para Engenharia Financeira e Acessibilidade Digital**

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-2b3a42?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0)
[![JSR](https://img.shields.io/badge/JSR-F7DF1E?style=for-the-badge&logo=jsr&logoColor=000)](https://jsr.io/@st-all-one/calc-auy)
[![Made in Brazil](https://img.shields.io/badge/Made_in-Brazil-009739?style=for-the-badge)](https://github.com/topics/brazil)

</div>

A **CalcAUY** é uma infraestrutura em **TypeScript** projetada para neutralizar a imprecisão do padrão IEEE 754, assegurando integridade atuária através da **Imutabilidade estrita e Árvore de Sintaxe Abstrata (AST)**, transformando cada operação matemática em uma evidência confiável, transparente, acessível e auditável.

---

## 📖 Documentação

- [Entendendo a CalcAUY](./docs/start.md)
- [Exemplos de uso](./docs/examples.md)
- [Especificações](./docs/specs.md)
- [Segurança e Auditabilidade](./docs/audit.md)

## 🛣 Demonstração

Veja em execução na [Demonstração interativa]()

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

// ==== Cálculo de Juros Compostos ====
// == Parâmetros ==
const capitalInicial = 10_000.00;
const taxaJurosAnual = "14.75%";
const anosDecorridos = 3;

// == Construção da AST de cálculo [ M = C * (1 + j)^t ] ==
const montante = CalcAUY
    .from(capitalInicial)
    .mult(
        CalcAUY.from(1)
            .add(taxaJurosAnual)
            .group()
            .pow(anosDecorridos),
    )
    .setMetadata("obs", "Juros de 14,75% a.a. (SELIC, Mar/26)");

// == Colapso da AST e definição estratégia de arredondamento ==
const resultado = montante.commit({ roundStrategy: "NBR5891" });

// == Extração dos Outputs ==
console.log(resultado.toMonetary());
// R$ 15.109,78

console.log(resultado.toUnicode());
// roundₙᵦᵣ₋₅₈₉₁(10000 × ((1 + 14.75%)³), 2) = 15109.78

console.log(resultado.toVerbalA11y());
// 10000 multiplicado por abre parênteses abre parênteses 1 mais 14.75% fecha parênteses elevado a 3 fecha parênteses é igual a 15109 vírgula 78 (Arredondamento: NBR-5891 para 2 casas decimais).

console.log(resultado.toAuditTrace());
/*
{"ast":{"kind":"operation","type":"mul","operands":[{"kind":"literal","value":{"n":"10000","d":"1"},"originalInput":"10000"},{"kind":"group","child":{"kind":"operation","type":"pow","operands":[{"kind":"group","child":{"kind":"operation","type":"add","operands":[{"kind":"literal","value":{"n":"1","d":"1"},"originalInput":"1"},{"kind":"literal","value":{"n":"59","d":"400"},"originalInput":"14.75%"}]}},{"kind":"literal","value":{"n":"3","d":"1"},"originalInput":"3"}]}}],"metadata":{"obs":"Juros de 14,75% a.a. (SELIC, Mar/26)"}},"finalResult":{"n":"96702579","d":"6400"},"strategy":"NBR5891"}
*/
```

## 🎯 Qual problema a CalcAUY resolve?

No desenvolvimento de softwares modernos, o uso do padrão **IEEE 754** (number/float) introduz um risco sistêmico. Erros de arredondamento binário, como o clássico `0.1 + 0.2 !== 0.3`, não são meras curiosidades matemáticas; em escala, transformam-se em rombos financeiros, falhas de compliance e passivos jurídicos.

A `CalcAUY` busca neutralizar essa imprecisão ao tratar o cálculo como um **artefato de engenharia persistente e auditável**, ao aplicar:

### 1. Engenharia Matemática

- **Precisão Racional**: Baseada em `BigInts`, a lib opera puramente com frações exatas `(n/d)`. Executando simplificação via **Algoritmo de Euclides** (MCD) em cada etapa, garantindo que a memória seja otimizada sem sacrificar o rigor matemático.

- **Precedência Rigorosa**: Implementa o padrão `PEMDAS/BODMAS`, tratando a exponenciação com **Associatividade à Direita** e garantindo que o agrupamento léxico proteja a ordem das operações conforme a intenção do cálculo.

- **Auditabilidade Forense via AST**: Toda operação constrói uma `Árvore de Sintaxe Abstrata (AST) imutável`. Isso permite "hibernar" cálculos complexos em JSON e reidratá-los sem perda de contexto, preservando a intenção original do cálculo.

- **Segurança por Design**: Opera sob o dogma de `Security by Default`, com redação automática de dados sensíveis (`PII`) em logs estruturados. A engine é protegida por gatekeepers estruturais que validam **estritamente** cada input, neutralizando vetores de ataque como `JSON Bombs` e `Stack Overflow`.

- **Integridade Atuária**: Implementação estrita da `NBR 5891` e algoritmos de `Resto de divisão Euclidiana` e `Maior Resto` para rateios monetários exatos, garantindo que nenhum centavo seja perdido ou tendenciado.

### 2. Developer Experience (DX), Portabilidade e Escalabilidade

- **Tipagem Estrita**: Desenvolvida sob o `Strict Mode máximo` do TypeScript, a lib utiliza `Type Guards` e campos privados para garantir que a integridade dos dados seja mantida do código à transpilação.

- **Agnosticismo de Runtime**: Distribuída via `JSR`, a biblioteca é nativamente compatível com `Deno`, `Node.js`, `Bun` e `Cloudflare Workers`. Sem dependências pesadas, ela mantém um rastro zero de IO, operando puramente em memória.

- **Interoperabilidade Total**: Através do sistema de `Custom Output Processors`, a lib é extensível para suportar qualquer formato de saída (Protobuf, XML, Excel) sem inflar o núcleo do projeto.

- **Processamento em Lotes**: O utilitário `processBatch` permite processar volumes massivos de transações (ex: 100.000 cálculos) sem congelar o servidor, utilizando a API `scheduler.yield()` para equilibrar o Throughput e a Responsividade.

### 3. Acessibilidade (A11y) e Universalidade

- **Matemática Acessível**: A `CalcAUY` transforma a AST em diferentes representações visuais e integrativas, como narrações verbais em 8 idiomas (`toVerbalA11y`), unicode para CLIs (`toUnicode`), LaTeX para relatórios (`toLaTeX`), HTML via KaTeX (`toHTML`), AST serializada para auditoria profunda (`toAuditTrace`) e diversos outros outputs, garantindo que cada cálculo possa ser lido por pessoas, máquinas e leitores de tela.

## Por que a CalcAUY foi criada?

> Em linhas gerais, porque não achei nenhuma outra maneira (sem gambiarras colossais) de fazer o que essa lib faz.
> 
> Stallone L.S., 2026-04-11

## 🔍 Testes

**📊 Code Coverage**
> ```bash
> // 2026-04-11
> ❯ deno task coverage:dev
>
> ok | 21 passed (247 steps) | 0 failed (50s)
>
> | File                               | Branch % | Function % | Line % |
> | ---------------------------------- | -------- | ---------- | ------ |
> | mod.ts                             |    100.0 |      100.0 |  100.0 |
> | src/ast/builder_utils.ts           |    100.0 |      100.0 |  100.0 |
> | src/ast/engine.ts                  |     97.6 |      100.0 |   97.7 |
> | src/builder.ts                     |     94.7 |      100.0 |   95.4 |
> | src/core/constants.ts              |    100.0 |      100.0 |  100.0 |
> | src/core/errors.ts                 |    100.0 |      100.0 |  100.0 |
> | src/core/metadata.ts               |    100.0 |      100.0 |  100.0 |
> | src/core/rational.ts               |     92.1 |      100.0 |   96.1 |
> | src/i18n/i18n.ts                   |     50.0 |      100.0 |  100.0 |
> | src/output.ts                      |     87.3 |      100.0 |   96.2 |
> | src/output_internal/image_utils.ts |     75.0 |      100.0 |   96.2 |
> | src/output_internal/renderer.ts    |     93.3 |      100.0 |   82.5 |
> | src/output_internal/slicer.ts      |     69.2 |      100.0 |   87.8 |
> | src/parser/lexer.ts                |     97.3 |      100.0 |   99.0 |
> | src/parser/parser.ts               |     90.2 |      100.0 |   93.6 |
> | src/rounding/rounding.ts           |     89.7 |      100.0 |   91.7 |
> | src/utils/batch.ts                 |     77.8 |      100.0 |   88.9 |
> | src/utils/logger.ts                |    100.0 |      100.0 |  100.0 |
> | src/utils/sanitizer.ts             |     98.8 |      100.0 |   99.0 |
> | src/utils/unicode.ts               |     80.0 |      100.0 |  100.0 |
> | All files                          |     93.6 |      100.0 |   96.3 |
> ```

**🛡️ Code Quality (SonarQube)**
> 2026-04-11
> [![Resultado do SonarQube Scanner de 11 de Abril de 2026, indicando: 0 issues Security, 0 issues Reliability, 0 issues Maintainability, 95.5% Coverage, 7.5% Duplications, 0 Security Hotspots](.github/assets/sonarqube_2026_04_11.png)](#)


**📛 Stress Test**
> ```bash
> // 2026-04-11
> ❯ deno test tests/stress.test.ts
> ┌───────────────────────────────┬─────────────────────────────────────────┐
> │ (idx)                         │ Values                                  │
> ├───────────────────────────────┼─────────────────────────────────────────┤
> │ 1_cpu_limit_complex_root      │ "5.3984ms"                              │
> │ 2_extensive_ast_depth         │ "2.6904ms"                              │
> │ 3_costly_repeated_pow         │ "796.9134ms (iterations: 100000)"       │
> │ 4_simple_real_repeated        │ "372.0489ms (iterations: 100000)"       │
> │ 5_metadata_cloning_stress     │ "150.2125ms (metadata_keys: 1000)"      │
> │ 6_rational_explosion_gcd      │ "0.2576ms"                              │
> │ 7_slicing_massacre            │ "56.2544ms (slices: 100000)"            │
> │ 8_burst_concurrency_ddos      │ "682.9196ms (concurrent_tasks: 100000)" │
> │ 9_batch_processing_controlled │ "802.4321ms (total_tasks: 100000)"      │
> │ 10_logging_policy_race_stress │ "19.8431ms (errors: 0)"                 │
> │ 11_bigint_limit_torture       │ "0.8028ms (caught_overflow: true)"      │
> │ 12_malicious_json_hydration   │ "1.8900ms (deflected: true)"            │
> └───────────────────────────────┴─────────────────────────────────────────┘
>
> ❯ deno test tests/output_stress.test.ts
> ┌────────────────────────────┬────────────────────────────────┐
> │ (idx)                      │ Values                         │
> ├────────────────────────────┼────────────────────────────────┤
> │ 1_monetary_cache_hit_rate  │ "168.4785ms (iters: 100000)"   │
> │ 2_verbal_a11y_deep_ast     │ "0.7537ms (chars: 9079)"       │
> │ 3_render_complexity_nested │ "1.9816ms (latex_len: 4395)"   │
> │ 4_html_generation_burst    │ "56.6988ms (iters: 100000)"    │
> │ 5_high_precision_slicing   │ "81.2635ms (slices: 100000)"   │
> │ 6_to_json_consolidation    │ "750.2522ms (iters: 100000)"   │
> │ 7_locale_switching_burst   │ "184.3834ms (switches: 90000)" │
> │ 8_custom_processor_stress  │ "145.7747ms (iters: 100000)"   │
> │ 9_image_buffer_svg_stress  │ "14.5307ms (iters: 100000)"    │
> └────────────────────────────┴────────────────────────────────┘
> ```

<details>
<summary><b>🔍 Detalhes do Hardware </b></summary>

```bash
❯ deno --version
deno 2.7.11 (stable, release, x86_64-unknown-linux-gnu)
v8 14.7.173.7-rusty
typescript 5.9.2

❯ inxi -Fzx
System:
  Kernel: 6.19.11-200.fc43.x86_64 arch: x86_64 bits: 64 compiler: gcc
    v: 15.2.1
  Desktop: GNOME v: 49.5 Distro: Fedora Linux 43 (Workstation Edition)
Machine:
  Type: Laptop System: LENOVO product: 82MF v: IdeaPad 3 15ALC6
  Mobo: LENOVO model: LNVNB161216 v: NO DPK
    Firmware: UEFI vendor: LENOVO v: GLCN68WW date: 03/19/2025
CPU:
  Info: 6-core model: AMD Ryzen 5 5500U with Radeon Graphics bits: 64
    type: MT MCP arch: Zen 2 rev: 1 cache: L1: 384 KiB L2: 3 MiB L3: 8 MiB
  Speed (MHz): avg: 1400 min/max: 1400/2100 boost: disabled cores: 1: 1400
    2: 1400 3: 1400 4: 1400 5: 1400 6: 1400 7: 1400 8: 1400 9: 1400 10: 1400
    11: 1400 12: 1400 bogomips: 50303
  Flags-basic: avx avx2 ht lm nx pae sse sse2 sse3 sse4_1 sse4_2 sse4a
    ssse3 svm
Graphics:
  Display: wayland server: X.Org v: 24.1.9 with: Xwayland v: 24.1.9
    compositor: gnome-shell driver: dri: radeonsi gpu: amdgpu
    resolution: 1920x1080~144Hz
  API: OpenGL v: 4.6 vendor: amd mesa v: 25.3.6 glx-v: 1.4
    direct-render: yes renderer: AMD Radeon Graphics (radeonsi renoir ACO DRM
    3.64 6.19.11-200.fc43.x86_64)
  API: EGL Message: EGL data requires eglinfo. Check --recommends.
  Info: Tools: api: glxinfo x11: xdriinfo, xdpyinfo, xprop, xrandr
Drives:
  ID-1: /dev/nvme0n1 vendor: Crucial model: CT500P3SSD8 size: 465.76 GiB
    temp: 33.9 C
Partition:
  ID-1: / size: 463.17 GiB fs: btrfs
Swap:
  ID-1: swap-1 type: zram size: 6 GiB
Info:
  Memory: total: 20 GiB
  Processes: 526 Uptime: 5m Init: systemd
  Packages: 22 note: see --rpm Compilers: gcc: 15.2.1 Shell: Zsh v: 5.9
    inxi: 3.3.40
```
</details>

---

<div align="center">

**A CalcAUY é a ferramenta para o engenheiro que não aceita resultados sem provas auditáveis**

---

-- Este projeto é Open Source e Licenciado através da **Mozilla Public License v2.0** --

</div>
