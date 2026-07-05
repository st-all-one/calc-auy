# Performance e Otimização

A CalcAUY foi projetada para processar milhões de operações sem pressionar o GC ou estourar a pilha.

## Cache Inteligente (2 Níveis)

### Hot Cache (Strong References)

- Mapa LRU-like com **512 entradas**
- Armazena nós literais mais frequentes (0, 1, 100, 10%, etc.)
- Acesso O(1) — valores quentes nunca são coletados

### Cold Cache (WeakRef + FinalizationRegistry)

- Nós menos frequentes via `WeakRef`
- GC recupera memória automaticamente sob pressão
- `FinalizationRegistry` limpa o índice do cache quando o nó é coletado

```
from("10%") → Hot Cache hit? → retorna nó imediatamente
           → Cold Cache hit? → promove para Hot, retorna nó
           → Miss → cria nó, insere em ambos os caches
```

### ❌ Session Cache

Removido após análise comprovar que não trazia benefício mensurável sobre o sistema Hot+Cold.

## Hierarchical Flattening

Operações lineares (`add(a).add(b).add(c)...`) são achatadas em uma lista interna quando ultrapassam `MAX_OPERANDS = 100`.

- Complexidade: **O(N)** tempo, **O(log N)** profundidade
- Previne **Stack Overflow** em somatórios com 1000+ operandos
- Evita custo O(N²) de cópia de arrays em acúmulos massivos

## GCD Simplification (Híbrido)

A engine aplica MDC (Máximo Divisor Comum) a cada operação para manter numeradores e denominadores minimalistas:

- **Small GCD**: lookup table para valores pequenos (fast path)
- **Large GCD**: algoritmo Euclidiano clássico para BigInts grandes
- Resultado: operações com BigInt permanecem rápidas mesmo após centenas de passos

## Late Rounding

Diferente de bibliotecas que arredondam a cada passo, a CalcAUY mantém a forma racional `n/d` até o `commit()` ou output:

- Precisão interna de **50 casas decimais** para transições racional→decimal
- Arredondamento ocorre **uma única vez**, no momento da projeção
- Elimina erro cumulativo e economiza CPU

```
from("10").div(3).mult(3) → mantém (10/3) * 3 = 30/3 = 10/1 → exato
Lib decimal tradicional   → 3.3333 * 3 = 9.9999 → erro
```

## Limites de Segurança

| Limite | Valor | Proteção |
|---|---|---|
| `MAX_BI_BITS` | 1.000.000 bits | Memory exhaustion (DoS) |
| `MAX_RECURSION_DEPTH` | 500 | Stack Overflow |
| `MAX_OPERANDS` | 100 | Flat → Hierarchical |
| `HOT_CACHE_LIMIT` | 512 | Memória do Hot Cache |

## Bitwise Optimization

Operações de potência e checagem de paridade (NBR 5891, HALF_EVEN) usam operadores bit-a-bit onde possível para máxima performance na V8.

---

[↑ Voltar ao índice](../index.md)
