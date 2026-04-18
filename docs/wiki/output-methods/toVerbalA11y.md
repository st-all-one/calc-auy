# Método: `toVerbalA11y()`

O `toVerbalA11y()` transforma a estrutura lógica da árvore de cálculo em uma sequência de frases fonéticas naturais, permitindo que o rastro de auditoria seja compreendido por usuários de leitores de tela ou interfaces de voz.

## ⚙️ Funcionamento Interno

1.  **Mapeamento Semântico:** Utiliza o dicionário de tradução (I18n) para converter operadores em palavras (ex: `+` vira "mais", `/` vira "dividido por").
2.  **Detecção de Hierarquia:** Identifica o início e o fim de grupos (parênteses) e insere pausas verbais ou marcadores como "abre parênteses" e "fecha parênteses".
3.  **Localização Fonética:** Formata o separador decimal conforme o idioma (ex: vírgula no `pt-BR`, ponto no `en-US`) para garantir que o sintetizador de voz (TTS) fale o número corretamente.
4.  **Precisão Verbal:** Inclui no final da frase a estratégia de arredondamento aplicada e a precisão utilizada.
5.  **Telemetria:** Monitorado por `TelemetrySpan` para medir o custo da tradução da árvore.

## 🎯 Propósito
Garantir a **Acessibilidade Universal (A11y)**, cumprindo normas internacionais de inclusão digital e fornecendo uma forma auditiva de conferência de dados.

## 💼 10 Casos de Uso Reais

1.  **Leitores de Tela (NVDA/JAWS):** Fornecer a descrição detalhada da fórmula para usuários cegos.
```typescript
// Exemplo 1: Descrição para aria-label
const label = res.toVerbalA11y();
```
```typescript
// Exemplo 2: Texto alt para imagem de rastro
const altText = `Imagem contendo o cálculo: ${output.toVerbalA11y()}`;
```

2.  **Assistentes de Voz (Alexa/Siri):** Confirmação audível de cálculos financeiros.
```typescript
// Exemplo 1: Resposta de Skill da Alexa
return responseBuilder.speak(`Seu saldo é ${res.toVerbalA11y()}`).getResponse();
```
```typescript
// Exemplo 2: Siri Shortcut output
console.log(output.toVerbalA11y({ locale: "en-US" }));
```

3.  **Sistemas de URA (Telefonia):** Leitura de detalhamento de faturas via telefone.
```typescript
// Exemplo 1: XML do Twilio (Say)
const twiml = `<Response><Say language="pt-BR">${res.toVerbalA11y()}</Say></Response>`;
```
```typescript
// Exemplo 2: Integração com Amazon Polly
polly.synthesizeSpeech({ Text: output.toVerbalA11y(), LanguageCode: "pt-BR" });
```

4.  **Educação Inclusiva:** Ferramenta de apoio para estudantes com deficiência visual em matérias de exatas.
```typescript
// Exemplo 1: Player de áudio em portal didático
playAudio(res.toVerbalA11y());
```
```typescript
// Exemplo 2: Transcrição fonética para braille tátil
const brailleCode = toBraille(output.toVerbalA11y());
```

5.  **Apps de "Hands-Free":** Conferência de valores enquanto o usuário dirige ou opera máquinas.
```typescript
// Exemplo 1: Feedback tátil e sonoro
if (confirmed) speak(res.toVerbalA11y());
```
```typescript
// Exemplo 2: Voice-over em app industrial
androidSpeech.speak(output.toVerbalA11y());
```

6.  **Paineis de Senha com Áudio:** Anúncio de valores calculados em filas de atendimento.
```typescript
// Exemplo 1: Chamada de guichê
announcer.enqueue(`Valor do ticket: ${res.toVerbalA11y()}`);
```
```typescript
// Exemplo 2: Resumo de caixa eletrônico (ATM)
atmSpeaker.say(output.toVerbalA11y());
```

7.  **Sistemas de PDV Inclusivos:** Garantia de que o cliente compreenda taxas aplicadas no checkout.
```typescript
// Exemplo 1: Customer facing display (audio)
posTerminal.audioOutput(res.toVerbalA11y());
```
```typescript
// Exemplo 2: Confirmação de PIN Pad
pinPad.displayText(output.toVerbalA11y({ decimalPrecision: 2 }));
```

8.  **Verificação de Erros em Massa:** Ouvir o rastro de logs complexos para identificar anomalias estruturais.
```typescript
// Exemplo 1: Loop de auditoria auditiva
for (const err of errors) { await tts.read(err.res.toVerbalA11y()); }
```
```typescript
// Exemplo 2: Debugging por áudio (Headphones)
if (isHeadsetConnected) speak(output.toVerbalA11y());
```

9.  **Relatórios de Auditoria Falados:** Resumo executivo auditivo de grandes consolidações financeiras.
```typescript
// Exemplo 1: Geração de podcast de faturamento
const script = `Relatório do dia: O total foi ${res.toVerbalA11y()}`;
```
```typescript
// Exemplo 2: Resumo em áudio para gerência
managerApp.playAudioReport(output.toVerbalA11y());
```

10. **Treinamento de Equipes:** Demonstração verbal da lógica de precificação da empresa.
```typescript
// Exemplo 1: Audio guide em LMS
const lesson = `Nesta etapa, calculamos: ${res.toVerbalA11y()}`;
```
```typescript
// Exemplo 2: Explicação automática de política comercial
bot.explain(output.toVerbalA11y());
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Casas decimais do valor falado. | Define como o número final será verbalizado. |
| `locale` | `string` | Idioma da tradução. | Altera todos os tokens verbais (ex: "plus" vs "mais"). |

## 💡 Recomendações
- **Use o parâmetro `customLocale`** se sua empresa utiliza termos técnicos específicos (ex: em vez de "vezes", usar "multiplicado pelo fator").
- **Evite precisões muito altas (ex: > 10)** em saídas de voz, pois a leitura de muitos dígitos pode confundir o ouvinte.

## 🏗️ Considerações de Engenharia
- **Tokenização Recursiva:** O método reconstrói a árvore de forma profunda, garantindo que mesmo operações aninhadas complexas tenham sentido verbal.
- **Deno-Agnostic:** A lógica de tradução é pura e não depende de APIs de áudio nativas, gerando apenas a string pronta para qualquer motor TTS.
