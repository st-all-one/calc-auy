# 13 - Estratégias de Arredondamento e Identificadores Visuais

```mermaid
flowchart LR
    R[Rational: 2.5] --> NBR[NBR: 2]
    R --> HU[Half-Up: 3]
    R --> TR[Trunc: 2]
    R --> CE[Ceil: 3]
```

## Objetivo
Definir os algoritmos de arredondamento suportados pela CalcAUY 2.0, garantindo que o colapso do `RationalNumber` para a precisão de saída seja determinístico, auditável e visualmente identificado em todos os formatos.

## Catálogo de Estratégias

| Estratégia | ID Visual | Nome Técnico | Descrição Matemática |
| :--- | :--- | :--- | :--- |
| **NBR-5891** | `NBR` | `NBR5891` | Norma Brasileira: Arredondamento ao par mais próximo em caso de 0.5 exato. |
| **Half-Up** | `HU` | `HALF_UP` | Comercial: 0.5 ou superior arredonda para cima (longe do zero). |
| **Half-Even** | `HE` | `HALF_EVEN` | Bancário: Arredonda para o número par mais próximo (elimina viés estatístico). |
| **Truncate** | `TR` | `TRUNCATE` | Corte Seco: Simplesmente descarta os decimais excedentes (direção ao zero). |
| **Ceil** | `CE` | `CEIL` | Teto: Arredonda sempre para o maior inteiro seguinte (direção ao infinito positivo). |

## Representação nos Outputs

Para garantir a transparência da auditoria, o identificador da estratégia deve acompanhar o resultado final nos formatos visuais.

### 1. LaTeX
A estratégia aparece como um subscrito no operador `\text{round}`.
- **Formato:** `\text{round}_{\text{ID}}(base, precisão) = resultado`
- **Exemplo (NBR):** `\text{round}_{\text{NBR-5891}}(1.225, 2) = 1.22`

### 2. HTML (KaTeX)
Renderização rica com acessibilidade.
- **Visual:** $\text{round}_{\text{NBR-5891}}$
- **A11y:** O `aria-label` do fragmento inclui a estratégia por extenso.

### 3. Unicode (CLI/Logs)
Utiliza glifos subscritos para o identificador.
- **Mapeamento:** `HU` -> `ₕᵤ`, `HE` -> `ₕₑ`, `TR` -> `ₜᵣ`, `CE` -> `꜀ₑ`, `NBR` -> `ₙᵦᵣ`.
- **Exemplo:** `roundₙᵦᵣ(1.225, 2) = 1.22`

### 4. Verbal (A11y)
Deve ser por extenso e localizado.
- **Exemplo:** "... arredondado via Norma Brasileira NBR-5891 para duas casas decimais."

### 5. ImageBuffer (SVG)
O renderizador SVG deve garantir que o identificador subscrito (NBR, HU, etc.) seja renderizado com clareza, utilizando fontes monoespaçadas ou KaTeX integrado para evitar confusão visual.

## Implementação na AST e RationalNumber

### Colapso de Arredondamento
O arredondamento ocorre apenas no método `.commit(roundStrategy)` e é re-executado nos métodos de output se a `decimalPrecision` for alterada.

1. **Entrada:** `RationalNumber` (n/d) com precisão interna de 50 casas.
2. **Escalonamento:** Multiplica-se o valor pela potência de 10 da precisão de saída desejada.
3. **Análise de Resto:** Verifica-se o valor fracionário remanescente.
4. **Aplicação da Lógica:**
   - **NBR-5891:** Se o resto for exatamente 0.5, olha-se para o dígito anterior. Se for ímpar, arredonda. Se for par, mantém.
   - **Half-Up:** Se o resto for >= 0.5, soma 1 ao inteiro.
   - **Half-Even:** Idêntico ao NBR para casos genéricos, mas rigoroso na paridade do BigInt.
   - **Truncate:** Ignora o resto.
   - **Ceil:** Se houver qualquer resto positivo, soma 1 ao inteiro.

### Armazenamento na AST (Audit Trace)
O `ASTSnapshot` gerado pelo `toAuditTrace()` deve incluir a estratégia de arredondamento no nó raiz (CommitNode), permitindo que softwares de terceiros validem o cálculo seguindo a mesma regra.
```json
{
  "type": "commit",
  "roundStrategy": "NBR5891",
  "visual_id": "NBR",
  "final_value": { "n": "126", "d": "100" }
}
```
