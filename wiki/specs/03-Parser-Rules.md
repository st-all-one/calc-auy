# 03 - Gramática e Regras do Parser

```mermaid
flowchart LR
    Str["String: '(10+5)*2'"] --> Lexer[Lexer / Tokenizer]
    Lexer --> Tokens["[LPAREN, NUM(10), PLUS, ...]"]
    Tokens --> Parser[Recursive Descent Parser]
    Parser --> AST[AST Immutable Tree]
```

## Objetivo
Transformar expressões em string (ex: `(10 + 5) / 3`) em uma Árvore AST robusta, respeitando o rigor matemático de precedência e identificando erros em tempo de análise através do CalcAUYError.

## Precedência e Associatividade
O parser deve seguir as regras matemáticas padrão (PEMDAS/BODMAS):
1. **P**arênteses / Grupos
2. **E**xponentes (Potência e Raiz) - **Associatividade à Direita** (`2^2^3` = `2^(2^3)`)
3. **M**ultiplicação e **D**ivisão - **Associatividade à Esquerda**
4. **A**dição e **S**ubtração - **Associatividade à Esquerda**

### A Regra Crítica da Exponenciação
Diferente da implementação anterior, a nova lib deve tratar `a^b^c` como `a^(b^c)`. O rastro de auditoria (LaTeX, Unicode) deve refletir isso explicitamente.

## Tipagem Literal Rigorosa
O parser deve utilizar tipos literais para definir os tokens permitidos:
- `TokenKind = 'NUMBER' | 'LPAREN' | 'RPAREN' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'DOUBLE_SLASH' | 'CARET' | 'PERCENT' | 'EOF'`

## Tratamento de Inconsistências e Redundâncias
O parser deve disparar um `CalcAUYError` diante de qualquer uma das seguintes situações:
1. **Redundância de Grupos:** `((10 + 5))` - Identificar e sugerir simplificação ou rejeitar (se configurado como strict).
2. **Operadores Adjacentes Inválidos:** `10 + * 5`.
3. **Parênteses Não Balanceados:** `(10 + 5`.
4. **Expressão Vazia ou Incompleta:** `10 +`.
5. **Formatos Numéricos Ambíguos:** Rejeitar qualquer entrada que não possa ser convertida em um `RationalNumber` sem perda de informação.
6. **Desambiguação de Percentual:** O símbolo `%` pode atuar como operador de módulo (infix: `10 % 3`) ou como sufixo percentual (postfix: `10%`). O Parser utiliza lookahead para decidir: se o `%` não for seguido por um número ou parêntese, ele é tratado como sufixo e converte o literal anterior para `n/100`.

## Arquitetura do Parser
- **Lexer:** Transforma a string em uma lista de tokens.
- **Parser (Recursive Descent):** Constrói a árvore AST a partir da lista de tokens, garantindo que a hierarquia de nós respeite as precedências definidas.
- **Validator:** Percorre a árvore recém-criada para identificar redundâncias léxicas antes de retorná-la.
