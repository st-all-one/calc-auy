# CalcAUY: Especificações e Schemas Oficiais

A **CalcAUY** foi desenhada para ser o motor criptográfico e aritmético central de sistemas distribuídos e de alta segurança (Core Banking, Auditoria Forense, Tribunais). 

Para garantir interoperabilidade universal sem perda de precisão ou quebra de integridade, a estrutura do **Signed Audit Trace** (o Lacre do Cálculo) é formalmente especificada em múltiplos formatos de mercado, localizados na pasta `schema/`.

## 📂 Visão Geral dos Schemas

Os schemas garantem que, independente da linguagem ou banco de dados que consuma o rastro do cálculo, a estrutura recursiva da Árvore de Sintaxe Abstrata (AST) e a precisão do `BigInt` (Rational Number) sejam respeitadas.

### 🌐 Interoperabilidade Web & APIs
- [**`calc-auy.schema.json`**](../schema/calc-auy.schema.json): O JSON Schema (Draft 7) oficial. Essencial para validações de payload em APIs REST, Gateways (como Kong/Apigee) e bancos NoSQL baseados em documento (MongoDB).
- [**`calc-auy.schema.openapi.json`**](../schema/calc-auy.schema.openapi.json): Definição Swagger/OpenAPI v3. Pronta para ser importada no Postman, Insomnia ou geração de SDKs (via OpenAPI Generator) para tipagem estrita de payloads.
- [**`calc-auy.schema.graphql`**](../schema/calc-auy.schema.graphql): Definição de Tipos e Inputs para GraphQL. Útil para federação de APIs onde os rastros de cálculo são campos consultáveis em um grafo de auditoria maior.

### 💾 Persistência Relacional e ORMs
- [**`calc-auy.schema.sql`**](../schema/calc-auy.schema.sql): DDL genérico para bancos de dados relacionais padrão (PostgreSQL, MySQL). Define tabelas para armazenar instâncias e assinaturas de auditoria, usando colunas apropriadas (ex: `JSONB` no Postgres para a AST).
- [**`calc-auy.schema.sqlite`**](../schema/calc-auy.schema.sqlite): DDL otimizado para SQLite. Excelente para persistência local em aplicações desktop, mobile ou sistemas embarcados (Edge Computing).
- [**`calc-auy.schema.prisma`**](../schema/calc-auy.schema.prisma): Schema do Prisma ORM. A ponte ideal para ecossistemas Node/Deno modernos, garantindo tipagem forte na camada de persistência.
- [**`calc-auy.schema.kysely.ts`**](../schema/calc-auy.schema.kysely.ts): Definição de Tipos e Interface para Kysely. Essencial para query builders typesafe, permitindo inferência estrita de JSON/JSONB direto para a interface `CalculationNode`.

### ⚡ Serialização Binária de Alta Performance (Edge / IoT)
- [**`calc-auy.schema.proto`**](../schema/calc-auy.schema.proto): Definição de Protocol Buffers (gRPC). Garante a maior compactação possível para o payload e comunicação de baixíssima latência entre microserviços (backend-to-backend).
- [**`calc-auy.schema.cddl`**](../schema/calc-auy.schema.cddl): Especificação formal Concise Data Definition Language para **CBOR** (RFC 8610). Ideal para assinaturas de hardware, IoT e armazenamento de alta compactação sem perder os tipos numéricos exatos.
- [**`calc-auy.schema.msgpack.md`**](../schema/calc-auy.schema.msgpack.md): Especificação e mapeamento de tipos para **MessagePack**, outro formato binário extremamente leve, útil para cache distribuído (Redis).

## 🚀 Como Utilizar na Arquitetura

### 1. Recebimento e Armazenamento Seguros
Não armazene a AST como simples "texto livre". Utilize o esquema de banco de dados escolhido (ex: `.sql` com `JSONB`) para manter a estrutura original. As colunas de banco de dados para os atributos numéricos (`n` e `d`) dos números racionais devem sempre suportar grandes inteiros (ex: `NUMERIC` ou `VARCHAR(255)`), **nunca FLOAT ou DOUBLE**.

### 2. Contratos de API
Ao expor a CalcAUY como um microserviço, exponha o `calc-auy.schema.openapi.json` na rota de documentação. Isso garante que os consumidores da sua API enviem solicitações de `hydrate()` no formato correto, e saibam que as frações racionais virão encapsuladas de forma segura.

### 3. Edge Computing (Processadores Binários)
Caso implemente processadores customizados via `.toCustomOutput()`, utilize as definições `proto`, `cddl` ou `msgpack`. Elas mapeiam o número racional em campos binários eficientes, preservando os requisitos de prova matemática e assinatura digital.

---

> [!IMPORTANT]
> **Imutabilidade e Assinatura:** Independentemente do esquema utilizado (JSON, SQL ou Proto), a assinatura `BLAKE3` gerada no `commit()` é baseada no formato *JSON canônico* da biblioteca no momento do cálculo. Ao transacionar a AST por formatos binários ou armazená-la no banco, garanta que a desserialização retorne os tipos exatos para que uma futura hidratação e validação do Lacre não falhe.

---

[↑ Voltar ao índice](../index.md)
