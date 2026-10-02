# ADR-0009: Política de unsafe (A/B com Barra de Evidência)

## Status
Aceito

## Contexto
`unsafe` é permitido, confinado e condicionado a evidência.

## Decisão
1. **Confinamento**: apenas nos módulos `core::simd` e `core::ticks`
2. **Fallback obrigatório**: toda função `unsafe` tem gêmea `safe`
3. **Teste A/B**: benchmark pareado via `criterion`
4. **Só permanece** se ganho ≥ 15% no throughput ou ≥ 20% na latência p99
5. **Documentação**: cada `unsafe fn` traz `# Safety` e referência ao benchmark

## Consequências
- Sem esse protocolo, `unsafe` não entra
- Protege a garantia de correção do produto
