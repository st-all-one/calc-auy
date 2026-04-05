# Auditoria Técnica: `src/output_helpers/locales.ts`

## 1. Propósito
O módulo `locales.ts` funciona como um dicionário inteligente de fallback monetário. Sua responsabilidade é mapear localizações geográficas (locales) para suas moedas padrão correspondentes. Isso permite que a biblioteca formate valores financeiros automaticamente, mesmo que o usuário forneça apenas o idioma (locale) e não a moeda (currency).

## 2. Implementação Técnica
A implementação utiliza um mapeamento estático via objeto literal `LOCALE_CURRENCY_MAP`.
- **Estratégia de Tipagem:** O uso de `as const` no final do objeto garante que o TypeScript trate as chaves e os valores como literais estritos, permitindo que outros módulos (como o `options.ts`) derivem tipos dinamicamente a partir deste dicionário.
- **Suporte Regional:** Inclui mapeamentos para regiões críticas:
  - Brasil (`pt-BR` -> `BRL`)
  - EUA (`en-US` -> `USD`)
  - União Europeia e sub-locais (`en-EU`, `es-ES`, `fr-FR` -> `EUR`)
  - Ásia e Rússia (`zh-CN` -> `CNY`, `ja-JP` -> `JPY`, `ru-RU` -> `RUB`)

## 3. Onde e Como é Usado
- **Dependência de Configuração:** É importado por `options.ts` para derivar o tipo `LocaleLang` e por `output.ts` no construtor da classe `CalcAUDOutput`.
- **Fluxo de Dados:** Quando uma instância de `CalcAUDOutput` é criada, ela verifica se uma moeda foi especificada. Caso contrário, utiliza este mapa para resolver a moeda padrão baseada no locale ativo.

## 4. Padrões de Design
- **Lookup Pattern:** Um padrão simples e performático para resolução de constantes relacionadas.

## 5. Parecer do Auditor
- **Manutenibilidade:** A estrutura centralizada facilita a inclusão de novos países e moedas sem a necessidade de alterar a lógica do motor de cálculo.
- **Precisão de Negócio:** A inclusão de contextos europeus com línguas diferentes (Inglês, Espanhol, Francês) todos apontando para o Euro demonstra maturidade na compreensão de mercados internacionais.
