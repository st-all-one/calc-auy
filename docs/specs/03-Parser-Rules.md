# 03 - Gramática e Regras do Parser

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
- `TokenKind = 'NUMBER' | 'LPAREN' | 'RPAREN' | 'OP_ADD' | 'OP_SUB' | 'OP_MUL' | 'OP_DIV' | 'OP_POW' | 'OP_MOD'`

## Tratamento de Inconsistências e Redundâncias
O parser deve disparar um `CalcAUYError` diante de qualquer uma das seguintes situações:
1. **Redundância de Grupos:** `((10 + 5))` - Identificar e sugerir simplificação ou rejeitar (se configurado como strict).
2. **Operadores Adjacentes Inválidos:** `10 + * 5`.
3. **Parênteses Não Balanceados:** `(10 + 5`.
4. **Expressão Vazia ou Incompleta:** `10 +`.
5. **Formatos Numéricos Ambíguos:** Rejeitar qualquer entrada que não possa ser convertida em um `RationalNumber` sem perda de informação.

## Arquitetura do Parser
- **Lexer:** Transforma a string em uma lista de tokens.
- **Parser (Recursive Descent):** Constrói a árvore AST a partir da lista de tokens, garantindo que a hierarquia de nós respeite as precedências definidas.
- **Validator:** Percorre a árvore recém-criada para identificar redundâncias léxicas antes de retorná-la.
