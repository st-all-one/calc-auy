# Otimização e Performance

A CalcAUY foi projetada para lidar com volumes massivos de cálculos (ex: processamento de milhões de faturas) sem comprometer a estabilidade do runtime ou causar pressão excessiva no Garbage Collector (GC).

## 1. Sessões de Cache (`createCacheSession`)

Para processamento em lote (batch), a criação de milhares de nós literais idênticos (como a string `"15%"`) pode sobrecarregar a memória. O método `CalcAUY.createCacheSession()` ativa um cache temporário e escopado.

### Como funciona:
Ao abrir uma sessão, a engine passa a reutilizar instâncias de objetos para valores repetidos. Isso reduz drasticamente a alocação de heap.

### Exemplo de Uso:
```typescript
const Billing = CalcAUY.create({ contextLabel: "billing-batch", salt: "vault-1" });

{
  // O uso do 'using' do TS 5.2+ fecha a sessão automaticamente ao sair do bloco
  using _session = CalcAUY.createCacheSession();

  for (const invoice of millionsOfInvoices) {
    // O valor "0.05" é instanciado uma única vez e reutilizado em todos os ciclos
    const res = await Billing.from(invoice.total).mult("0.05").commit();
    processResult(res);
  }
} // Sessão fechada aqui, liberando referências fortes
```

## 2. Gerenciamento de Memória (Hot vs Cold Cache)

A engine utiliza uma estratégia de cache em duas camadas para os nós da AST:

-   **Hot Cache (Strong References):** Mantém os 512 nós mais utilizados em uma `Map` tradicional. Isso garante acesso instantâneo para valores comuns (0, 1, 100, 10%, etc.).
-   **Cold Cache (WeakRef):** Valores menos frequentes são armazenados usando `WeakRef`. Isso permite que o Garbage Collector recupere a memória desses nós se o sistema estiver sob pressão, mantendo o cache "inteligente".

## 3. Prevenção de Stack Overflow

Cálculos extremamente profundos (ex: somatórios de milhares de itens em cadeia) podem causar estouro de pilha (`Stack Overflow`) em linguagens que não possuem otimização de chamada de cauda (TCO).

A CalcAUY mitiga isso através de:
-   **Hierarchical Flattening:** Operações com muitos operandos (ex: `.add(a).add(b)...`) são automaticamente "achatadas" em uma estrutura de lista interna, limitando a profundidade da árvore.
-   **Recursion Guards:** Limites configuráveis (`MAX_RECURSION_DEPTH = 500`) que interrompem o processamento de forma segura antes da falha do runtime.

## 4. Arredondamento Tardio (Efficiency)

Diferente de bibliotecas que arredondam a cada passo, a CalcAUY mantém a forma racional ($n/d$) até o último microssegundo.
-   **Vantagem:** Evita erros acumulados e economiza ciclos de CPU ao ignorar divisões decimais complexas durante a fase de construção.
-   **Simplificação Automática:** A engine aplica o MDC (Máximo Divisor Comum) em cada operação, mantendo os números o menor possível para otimizar operações com `BigInt`.

---

## 🏗️ Anotações de Engenharia
- **FinalizationRegistry:** A lib utiliza este recurso para monitorar quando o GC limpa um nó do Cold Cache, removendo automaticamente a entrada correspondente no índice de busca e mantendo o cache limpo.
- **Bitwise Optimization:** Operações de potência e checagem de paridade (NBR 5891) utilizam operadores bit-a-bit onde possível para máxima performance.
