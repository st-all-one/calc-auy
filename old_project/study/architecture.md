# Arquitetura do Projeto e Mapa de Estudo

## 1. Visão Geral da Arquitetura
A CalcAUD foi projetada sob o paradigma de **Arquitetura de Precisão Fixa e Imutabilidade**. O sistema é dividido em quatro camadas fundamentais que garantem que nenhum dado seja corrompido por erros de ponto flutuante (IEEE 754).

### Camadas do Sistema:
1. **Camada de Ingestão (Parsing):** Converte strings complexas para a escala interna de 10¹².
2. **Motor de Cálculo (Core Engine):** Realiza operações matemáticas imutáveis, acumulando provas de auditoria.
3. **Núcleo Matemático (Internal):** Algoritmos de alta performance para operações não nativas do BigInt (raízes e potências).
4. **Camada de Saída (Output Helpers):** Gerencia arredondamento fiscal, internacionalização e renderização visual.

---

## 2. Mapa de Localização Técnica
- **Onde está a Precisão?** Definida em `src/constants.ts` (12 casas decimais).
- **Onde está a Inteligência Matemática?** Em `src/internal/math_utils.ts` (Newton-Raphson e Busca Binária).
- **Onde está a Conformidade Fiscal?** Em `src/output_helpers/rounding_strategies.ts` (Implementação da NBR-5891).
- **Onde está a Acessibilidade (A11y)?** Em `src/output_helpers/verbal_translator.ts` e `i18n.ts`.

---

## 3. Árvore de Diretórios Comentada
```bash
/
├── src/                        # Código Fonte Principal
│   ├── constants.ts            # Escala fixa (10^12) e ativos estáticos (CSS KaTeX)
│   ├── errors.ts               # Erros padrão RFC 7807 (Problem Details)
│   ├── logger.ts               # Telemetria estruturada via LogTape
│   ├── main.ts                 # Classe CalcAUD: Motor imutável e acumulador de auditoria
│   ├── output.ts               # Classe CalcAUDOutput: Cache e despacho de saídas
│   ├── internal/               # NÚCLEO PRIVADO (Aritmética e Parsing)
│   │   ├── math_utils.ts       # Algoritmos Square-and-Multiply e Raízes N-ésimas
│   │   ├── parser.ts           # Motor Regex para parsing de Frações, Decimais e Científicos
│   │   ├── subscript.ts        # Conversor Unicode Subscrito (ex: roundₕₑ)
│   │   ├── superscript.ts      # Conversor Unicode Sobrescrito (ex: 10²)
│   │   └── wrappers.ts         # Guardião de precedência matemática (Parênteses léxicos)
│   └── output_helpers/         # AUXILIARES DE SAÍDA (Formatação e A11y)
│       ├── formatting.ts       # Reconstrução manual de strings sem usar Float
│       ├── html_generator.ts   # Renderização visual via KaTeX (HTML/CSS)
│       ├── i18n.ts             # Tokens e dicionários para 8 idiomas (A11y)
│       ├── image_generator.ts  # Exportação SVG com ViewBox heurístico
│       ├── lazy_rounding.ts    # Otimizador de performance (Arredondamento único)
│       ├── locales.ts          # Mapeamento inteligente de Moedas por Idioma
│       ├── options.ts          # Definições de estratégias (NBR, Half-Even, etc)
│       ├── rounding_manager.ts # Facade para despacho de algoritmos de arredondamento
│       ├── rounding_strategies.ts # Implementações técnicas (NBR-5891, Bancário, etc)
│       ├── verbal_generator.ts # Gerador de frases simples para leitores de tela
│       └── verbal_translator.ts # Motor de tradução e localização de alta fidelidade
└── study/                      # RELATÓRIOS DE AUDITORIA (Análise 1:1 de cada arquivo)
```
