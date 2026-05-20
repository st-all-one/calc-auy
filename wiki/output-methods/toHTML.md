# Processador: `toHTML()` (via `toCustomOutput`)

O processador HTML permite transformar a árvore de cálculo em um fragmento visual rico, ideal para interfaces web que precisam exibir a "prova matemática" de forma elegante e acessível.

> [!IMPORTANT]
> Este não é um método nativo da classe `CalcAUYOutput`. Ele deve ser importado da pasta `processor` e executado através do método `.toCustomOutput()`.

## ⚙️ Funcionamento

O processador percorre a AST e gera uma estrutura de tags HTML semânticas. Ele pode ser configurado para incluir classes CSS para estilização personalizada ou para integrar diretamente com bibliotecas de renderização matemática como **KaTeX**.

## 💼 Exemplo de Uso

```typescript
import { htmlProcessor } from "@st-all-one/calc-auy/processor/html";

const Finance = CalcAUY.create({ contextLabel: "invoice-system" });
const result = await Finance.from(100).add("15%").commit();

// Executando via Custom Output
const htmlFragment = result.toCustomOutput(htmlProcessor, {
  useKatex: true,
  theme: "dark",
  showMetadata: true
});

document.getElementById("audit-view").innerHTML = htmlFragment;
```

## 🛠️ Opções de Processamento

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `useKatex` | `boolean` | `false` | Se `true`, utiliza notação LaTeX compatível com KaTeX. |
| `theme` | `string` | `"light"` | Aplica classes de estilo pré-definidas (`light`, `dark`, `transparent`). |
| `showMetadata` | `boolean` | `true` | Exibe tooltips com as justificativas (`setMetadata`) de cada nó. |

## 🏗️ Anotações de Engenharia
- **Sanitização:** O processador HTML nativo garante que qualquer dado nos metadados seja escapado, prevenindo ataques de XSS se você estiver exibindo dados de entradas de usuários.
- **Acessibilidade:** Gera atributos `aria-label` automáticos baseados no rastro verbal (`toVerbalA11y`), garantindo que a prova matemática seja compreensível por leitores de tela.

---

## 🔗 Veja também
- [**Método: toCustomOutput()**](./toCustomOutput.md)
- [**Processador: toImageBuffer()**](./toImageBuffer.md)
