<div align="center">

# CalcAUY

**Infraestrutura Aritmética AST para Segurança Jurídica e Inclusividade Digital**

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-2b3a42?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0)
[![JSR](https://img.shields.io/badge/JSR-F7DF1E?style=for-the-badge&logo=jsr&logoColor=000)](https://jsr.io/@st-all-one/calc-auy)
[![Made in Brazil](https://img.shields.io/badge/Made_in-Brazil-009739?style=for-the-badge)](https://github.com/topics/brazil)

</div>

A **`CalcAUY`** é uma infraestrutura aritmética que resolve o risco sistêmico do padrão **IEEE 754** ao fundir precisão racional, integridade criptográfica e rastreabilidade total. Através de uma arquitetura baseada em **Imutabilidade Estrita e Árvore de Sintaxe Abstrata (AST)**, a biblioteca permite cálculos determinísticos, contextualizados e com lacre de integridade, servindo como evidência matemática confiável, transparente, inclusiva e auditável.

---

## 📖 Documentação

- [Entendendo a CalcAUY]()
- [Casos de uso]()
- [Segurança e Auditabilidade]()

## 🛩️ Demonstração

Veja em execução na [Demonstração interativa](https://calc-auy.st-all-one.deno.net/)

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

// Política de segurança (Lacre global)
const SALT = "MY-SECRET-SALT-2026";
const ENCODER = "HEX";
const ROUNDING_STRATEGY = "NBR5891";
const CONTEXT_LABEL = "financial"

const SafeCalc = CalcAUY.create({ 
    salt: SALT,
    encoder: ENCODER,
    roundingStrategy: ROUNDING_STRATEGY,
    contextLabel: CONTEXT_LABEL,
});

// == Parâmetros ==
const capitalInicial = 10_000.00;
const taxaJurosAnual = "14.75%";
const anosDecorridos = 3;

// Construção da AST de cálculo [ M = C * (1 + j)^t ]
const montante = SafeCalc
    .from(capitalInicial)
    .mult(
        SafeCalc.from(1)
            .add(taxaJurosAnual).setMetadata("ref", "SELIC, mar/26")
            .group()
            .pow(anosDecorridos),
    )
    .setMetadata("meta", {
        data_de_calculo: "2026-04-21T09:00:00.000Z",
        usuário: { id: 99, calc_token: "...UUID...", username: "st-all-one" },
    });

// Colapso da AST
const resultado = await montante.commit();

// == Extração dos Outputs ==
console.log(resultado.toMonetary());
// R$ 15.109,78

console.log(resultado.toUnicode());
// roundₙᵦᵣ₋₅₈₉₁(10000 × ((1 + 14.75%)³), 2) = 15109.78

console.log(resultado.toVerbalA11y());
// 10000 multiplicado por abre parênteses abre parênteses 1 mais 14.75% fecha parênteses elevado a 3 fecha parênteses é igual a 15109 vírgula 78 (Arredondamento: NBR-5891 para 2 casas decimais).

const RastroAuditavel = resultado.toAuditTrace();
console.log(RastroAuditavel);
/*
{"ast":{"kind":"operation","type":"mul","operands":[{"kind":"literal","value":{"n":"10000","d":"1"},"originalInput":"10000"},{"kind":"group","child":{"kind":"operation","type":"pow","operands":[{"kind":"group","child":{"kind":"operation","type":"add","operands":[{"kind":"literal","value":{"n":"1","d":"1"},"originalInput":"1"},{"kind":"literal","value":{"n":"59","d":"400"},"originalInput":"14.75%"}],"metadata":{"ref":"SELIC, mar/26"}}},{"kind":"literal","value":{"n":"3","d":"1"},"originalInput":"3"}]}}],"metadata":{"meta":{"data_de_calculo":"2026-04-21T09:00:00.000Z","usuário":{"id":99,"calc_token":"...UUID...","username":"st-all-one"}}}},"finalResult":{"n":"96702579","d":"6400"},"roundStrategy":"NBR5891","signature":"b99d38e3726589136134614d4d3734ed469c8a81261d88aba309c278151f1515"}
*/

// == Reabertura do cálculo ==
const calculoReaberto = await CalcAUY.hydrate(RastroAuditavel, { salt: SALT, encoder: ENCODER });

const aprovacao = await calculoReaberto
    .setMetadata("review", {
        status: "aprovado",
        usuario: { id: 1, date: "2026-04-21T10:00:00.000Z", username: "One" },
    })
    .commit({ roundStrategy: JSON.parse(RastroAuditavel).roundStrategy });

const rastroAprovado = aprovacao.toAuditTrace();
console.log(rastroAprovado);
/*
{"ast":{"kind":"operation","type":"mul","operands":[{"kind":"literal","value":{"n":"10000","d":"1"},"originalInput":"10000"},{"kind":"group","child":{"kind":"operation","type":"pow","operands":[{"kind":"group","child":{"kind":"operation","type":"add","operands":[{"kind":"literal","value":{"n":"1","d":"1"},"originalInput":"1"},{"kind":"literal","value":{"n":"59","d":"400"},"originalInput":"14.75%"}],"metadata":{"ref":"SELIC, mar/26"}}},{"kind":"literal","value":{"n":"3","d":"1"},"originalInput":"3"}]}}],"metadata":{"meta":{"data_de_calculo":"2026-04-21T09:00:00.000Z","usuário":{"id":99,"calc_token":"...UUID...","username":"st-all-one"}},"review":{"status":"aprovado","usuario":{"id":1,"date":"2026-04-21T10:00:00.000Z","username":"One"}}}},"finalResult":{"n":"96702579","d":"6400"},"roundStrategy":"NBR5891","signature":"d7fd4aff41a764903c997e5def57eadc655cbaed166f6c93ab59939f327c2d46"}
*/
```
> **NOTA:**
> Note que a `"signature"` mudou entre a versão **'original'** e a **'aprovada'**.
> 
> Esse comportamento é essencial para criar uma [**Cadeia de Custódia**](https://pt.wikipedia.org/wiki/Cadeia_de_cust%C3%B3dia), podendo ser usado para rastrear e validar modificações.

<details>
<summary><b>🛡️ Defesa Ativa contra Manipulação</b></summary>

```ts
// == Tentativa de Fraude ==
const fraude = JSON.parse(rastroAprovado);
fraude["roundStrategy"] = "TRUNCATE";

try {
    await CalcAUY.checkIntegrity(fraude, { salt: SALT, encoder: ENCODER });
} catch (e) {
    console.error(e);
}
/*
CalcAUYError: Violação de integridade detectada: a assinatura não confere com o conteúdo.
    at CalcAUY.checkIntegrity (file:///.../src/builder.ts:323:19)
    at async file:... {
  type: "https://github.com/st-all-one/calc-auy/blob/main/wiki/errors/integrity-critical-violation.md",
  title: "integrity-critical-violation",
  status: 500,
  detail: "Violação de integridade detectada: a assinatura não confere com o conteúdo.",
  instance: "urn:uuid:019db142-f59d-7606-9f20-6ebfa53759e0",
  context: {
    expected: "91e3f9b606fcf33f4c77dfa1d33e3faa889977558886005f922724dafd30cb1e",
    received: "d7fd4aff41a764903c997e5def57eadc655cbaed166f6c93ab59939f327c2d46"
  }
}
*/
```

> **NOTA:**
> Embora tenha sido mostrada a alteração no item "`roundStrategy`", qualquer alteração, em qualquer ponto do objeto serializado, seja um "`0`" a mais dentro da `AST` ou uma letra diferente em qualquer `metadado`, invalidará a assinatura da mesma forma.
> 
> A integridade do objeto é total: ou **tudo** permanece idêntico, ou é considerado [violação crítica de integridade](./wiki/errors/integrity-critical-violation.md).
> 
> O método "`.hydrate`" também executa essa verificação antes de qualquer avaliação da `AST`.

</details>

<br>

## 🌐 Possibilidades de Uso

A **`CalcAUY`** foi construída do zero para cenários onde a **prova do resultado** é tão importante quanto o valor final.

- **🏦 Financeiro & Contábil**: Juros compostos, amortizações e rateios de centavos (LRA) com precisão atuarial.
- **🏥 Saúde & Farmacologia**: Cálculos de dosagem exata (mg/kg) sem erros de arredondamento binário.
- **🧪 Ciência & Dados**: Estequiometria química e conversão de unidades sem o "drift" do ponto flutuante.
- **🏗️ Engenharias**: Cálculos de carga e tensões estruturais com rastro documental para certificações.
- **⚖️ Jurídico**: Geração de memoriais de cálculo em LaTeX para anexar como prova em processos.
- **🎮 Jogos & Simulações**: Física determinística e economia in-game perfeitamente sincronizada (Cross-platform).

---

## 🎯 Qual problema a CalcAUY resolve?

No desenvolvimento de softwares, o uso do padrão **IEEE 754** (`number/float`) introduz um risco sistêmico. Imprecisões binárias, como o clássico `0.1 + 0.2 !== 0.3`, não são meras curiosidades matemáticas; em escala, transformam-se em rombos financeiros, falhas de compliance e passivos jurídicos. Garantir a exatidão é o ponto de partida; **provar como o cálculo foi feito e a integridade da informação** é o que garante segurança jurídica para o ecossistema.

A **`CalcAUY`** elimina esses riscos ao tratar cada operação como um **artefato auditável assinado**, resolvendo a falta de transparência dos motores convencionais ao fornecer evidências de **todas as etapas** que compõem o resultado junto de uma **assinatura de integridade**, facilitando a conformidade técnica e jurídica da aplicação.

O que torna isso possível é a implementação destes três pilares:

### 1. Integridade Matemática

- **Aritmética Racional**: Operação baseada em frações verdadeiras `(n/d)` utilizando `BigInt`, com simplificações via **Algoritmo de Euclides (MCD)** em cada etapa, garantindo que o erro acumulado seja estruturalmente **zero**.

- **Determinismo Lógico**: Implementação rigorosa de **precedência matemática** [`(PEMDAS/BODMAS)`](https://pt.wikipedia.org/wiki/Ordem_de_opera%C3%A7%C3%B5es), garantindo que as operações alinhem a **intenção da conta** com as regras matemáticas, independente da plataforma de implantação.

- **Conformidade Técnica**: Arredondamento padrão [`ABNT NBR 5891`](https://pt.wikipedia.org/wiki/Arredondamento#Norma_ABNT_NBR_5891) e rateio por [`Maior Resto`](https://en.wikipedia.org/wiki/Mathematics_of_apportionment), assegurando justiça matemática em distribuições decimais.

### 2. Auditabilidade Forense

- **AST e Metadados**: Cada etapa do cálculo constrói uma **Árvore de Sintaxe Abstrata (AST) imutável**. Essa estrutura permite inserir metadados para contextualização de negócio que justificam o "porquê" de cada número, com parser para garantia de estabilidade na serialização para `JSON`.

- **Selo Criptográfico**: Implementação de assinatura digital via `BLAKE3 e K-Sort (Canonical String)` com suporte a `Salt`. Isso assegura o **não-repúdio**: o cálculo torna-se um "lacre" inviolável onde a matemática e os metadados são fundidos em um único hash. Qualquer tentativa de fraude no banco de dados invalida a assinatura instantaneamente.

- **Integridade**: Implementados 4 utilitários para lidar com a persistência e garantia de integridade:
    - `.hibernate()`: Serialização assinada para cálculos **não finalizados**, útil para criação de rascunhos.
    - `output.toAuditTrace()`: Serialização assinada para cálculos **finalizados**, com resultado racional definido.
    - `.checkIntegrity(AST, { salt, encoder })`: Valida se um cálculo serializado é íntegro `bit-a-bit`.
    - `.hydrate(AST, { salt, encoder })`: Verifica a integridade e reanima a árvore AST para continuidade do cálculo.

### 3. Universalidade Sistêmica

- **Segurança Estrutural**: Construída sob o dogma de **Zero tolerânica a Ambiguidades**, a **`CalcAUY`** aplica o `Strict Mode` máximo do TypeScript junto a `Type Guards`, campos privados (`#`) e **`parsers`** rigorosos, garantindo que a integridade dos dados seja aplicada da codificação à execução, retornando erros no padrão [`RFC 7807`](https://datatracker.ietf.org/doc/html/rfc7807) diante de qualquer inconsistência.

- **Outputs Multiformato**: Processadores de saída que traduzem a lógica interna em representações úteis para fins técnicos, de auditoria e de inclusividade digital:
    - `.toUnicode()`: Representação visual para interfaces de terminal (CLI).
    - `.toLaTeX() / .toHTML()`: Documentação técnica para relatórios e exibição via [KaTeX](https://katex.org/).
    - `.toVerbalA11y()` Para tradução da AST em linguagem natural em 8 idiomas; útil para adesão às diretrizes [`WCAG`](https://www.w3.org/WAI/standards-guidelines/wcag/) e [`eMAG`](https://emag.governoeletronico.gov.br/), com possibilidade de extensão.
    - `.toAuditTrace()`: JSON detalhado contendo o **"DNA do cálculo"** para auditoria profunda.
    - `.toCustomOutput(processor)`: Extensor do `output` para novos formatos (_protobuf, XML, Excel..._) sem interferência no resultado original.

- **Processamento Industrial**: Implementado o utilitário `ProcessBatchAUY(...)`, um motor de alta vazão projetado para processar volumes massivos _(1M+ registros)_ e fluxos contínuos (`Streaming`) sob complexidade `O(N)`, utilizando `workers lógicos`, `scheduler.yield()` e **redutores de memória** para prevenir o bloqueio do `Event Loop`.

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

--- Este projeto é Open Source e Licenciado através da **Mozilla Public License v2.0 (MPL-2.0)** ---

</div>
