# Comparação Técnica e Racional (Why CalcAUY?)

No ecossistema JavaScript/TypeScript, existem diversas bibliotecas para lidar com aritmética de precisão (ex: `big.js`, `decimal.js`, `bignumber.js`). Este documento explica por que a **CalcAUY** não é apenas "mais uma lib decimal", mas sim uma infraestrutura de **Auditabilidade Forense**.

## 📊 CalcAUY vs. Bibliotecas Tradicionais

| Característica | Libs Decimais (Tradicionais) | CalcAUY (Audit + A11y) |
| :--- | :--- | :--- |
| **Modelo Matemático** | Decimal de ponto fixo/flutuante. | **Frações Racionais (`n/d`)**. |
| **Precisão** | Alta, mas sujeita a erros de arredondamento cumulativos. | **Absoluta**. O erro de arredondamento é zero até o `commit()`. |
| **Rastro de Auditoria** | Nenhum. O resultado é apenas um número. | **AST Completa e Assinada (BLAKE3)**. |
| **Segurança Jurídica** | Difícil de provar "como" o valor foi obtido. | **Lacre digital** que prova a lógica e a origem. |
| **Acessibilidade** | Depende de implementações externas. | **Verbalização nativa (A11y)** em múltiplos idiomas. |
| **Interoperabilidade** | Troca de valores brutos. | **Portal de Jurisdições** (Handover entre instâncias). |

## 🧠 O Racional: A Morte do Erro Cumulativo

Bibliotecas decimais tradicionais arredondam em cada etapa intermediária (ou exigem que você defina uma precisão global). Se você divide 10 por 3 e depois multiplica por 3 em uma lib decimal, você pode acabar com `9.9999999`.

Na **CalcAUY**, a operação é mantida como `(10/3) * 3`. Internamente, os numeradores e denominadores são multiplicados e simplificados via MDC (Máximo Divisor Comum). O resultado é exatamente `30/3`, que simplifica para `10/1`. **O arredondamento só ocorre no momento da exibição (Output)**.

## ⚖️ Cadeia de Custódia do Cálculo

Para sistemas financeiros e jurídicos, o valor final é apenas metade da história. A outra metade é a **justificativa**.

- **Libs Tradicionais:** Tratam o cálculo como uma caixa preta.
- **CalcAUY:** Trata o cálculo como uma **evidência**. Cada metadado anexado (`.setMetadata()`) torna-se parte do rastro assinado. Se um auditor questionar um valor, você não mostra apenas o código-fonte; você mostra o rastro JSON assinado que descreve exatamente qual lei, artigo ou regra de negócio foi aplicada em cada passo.

## ♿ Acessibilidade como Primeiro Cidadão

A maioria das libs foca apenas no desenvolvedor. A CalcAUY foca no **usuário final**. Ao fornecer verbalização nativa, garantimos que pessoas com deficiência visual possam auditar seus próprios extratos, faturas e laudos com a mesma precisão e confiança que um usuário vidente.

## 🚀 Conclusão

Escolha a CalcAUY se o seu sistema exige:
1. **Não-Repúdio Técnico:** Provar que o cálculo não foi alterado no banco de dados.
2. **Conformidade Regulatória:** Atender normas estritas de transparência.
3. **Precisão Forense:** Onde cada centavo deve ter uma "certidão de nascimento".
