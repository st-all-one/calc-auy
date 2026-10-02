# ADR-011: i18n como Camada de Realização Linguística

## Status
Aceito

## Contexto
Não é tradução chave-valor. É NLG determinístico.

## Decisão
- SRL (Semantic Representation) independente de idioma
- Trait `VerbalRealizer` por idioma
- Tabelas de palavras-número são dados; a gramática é código

## Consequências
- Idiomas podem reordenar e mudar a estratégia de leitura
- Camada `calc-auy-output::verbal` só depende do trait
- i18n por último, mas o *seam* é definido desde o início
