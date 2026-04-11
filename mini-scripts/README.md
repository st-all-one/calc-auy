# 🛠️ CalcAUY - Mini Scripts & Utilitários

Esta pasta contém ferramentas auxiliares e Provas de Conceito (POCs) utilizadas para testar cenários especiais, automatizar a geração de ativos e validar a natureza agnóstica da biblioteca **CalcAUY**.

## 🚀 Propósito
O objetivo principal é isolar processos que não pertencem ao *core* da biblioteca (como rasterização de imagens ou manipulação pesada de CSS), mas que são essenciais para garantir que a entrega final da lib seja autossuficiente e de alta qualidade.

## 📂 Estrutura de Pastas

### 📸 `image-generation-poc/`
Contém scripts para validar a renderização do rastro de auditoria em formatos de imagem real (PNG/JPG).
- **Finalidade:** Provar que o buffer HTML/CSS gerado pela lib pode ser convertido em imagens de alta definição (4K) de forma offline.
- **Tecnologia:** Utiliza **Puppeteer** (Headless Chrome) para garantir fidelidade total às fontes matemáticas.

### 🎨 `katex-special-minification/`
Ferramentas para o processamento do motor visual KaTeX.
- **Finalidade:** Converter as fontes `.woff2` originais em strings Base64 e injetá-las diretamente no CSS.
- **Resultado:** Gera um CSS minificado autossuficiente que é embutido na constante `KATEX_CSS_MINIFIED` no core da lib.

## 🛠️ Como Executar
Todos os scripts nesta pasta devem ser executados utilizando a configuração local do Deno para garantir que as dependências (como Puppeteer e KaTeX) sejam resolvidas corretamente sem "sujar" o projeto principal.

**Exemplo de execução:**
```bash
# Rodar o POC de imagem
deno run -A --config mini-scripts/deno.jsonc mini-scripts/image-generation-poc/test_image_generation.ts

# Rodar o gerador de CSS
deno run -A --config mini-scripts/deno.jsonc mini-scripts/katex-special-minification/generate_inline_css.ts
```

## ⚠️ Observações de Workspace
Esta pasta faz parte do **Workspace do Deno** definido na raiz do projeto. Isso permite que os scripts referenciem `@calc-auy` apontando diretamente para o código fonte local (`mod.ts`), facilitando testes em tempo real de novas funcionalidades.
