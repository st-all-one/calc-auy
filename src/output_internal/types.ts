/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalcAUYOutput } from "../output.ts";
import type { RationalNumber } from "../core/rational.ts";
import type { CalculationNode } from "../ast/types.ts";
import type { RoundingStrategy } from "../core/constants.ts";
import type { CalcAUYLocale } from "../core/types.ts";
import type { CalcAUYCurrency } from "../core/types.ts";

/**
 * Global configuration options for outputs.
 */
export type OutputOptions = {
    decimalPrecision?: number;
    locale?: CalcAUYLocale;
    currency?: CalcAUYCurrency;
    roundStrategy?: RoundingStrategy;
    [key: string]: unknown;
};

/**
 * Assinatura para processadores de saída customizados.
 *
 * Permite estender a CalcAUYLogic com novos formatos (XML, CSV, Protobuf, etc)
 * sem modificar o core da biblioteca.
 *
 * @typeParam Toutput - O tipo de retorno esperado pelo processador.
 * @typeParam Toptions - O tipo das opções customizadas (estende OutputOptions).
 */
export type CalcAUYCustomOutput<Toutput, Toptions extends OutputOptions = OutputOptions> = (
    this: CalcAUYOutput,
    context: CalcAUYCustomOutputContext<Toptions>,
) => Toutput;

/**
 * Contexto de dados fornecido aos processadores customizados.
 *
 * **Engenharia:** Fornece acesso direto à AST e ao RationalNumber (n/d),
 * além de referências pré-bound para todos os métodos de exportação padrão.
 *
 * @typeParam Toptions - O tipo das opções customizadas.
 */
export type CalcAUYCustomOutputContext<Toptions extends OutputOptions = OutputOptions> = {
    /** O valor final consolidado em forma racional absoluta. */
    result: RationalNumber;
    /** A árvore de sintaxe completa para reconstrução customizada. */
    ast: CalculationNode;
    /** A estratégia de arredondamento aplicada no commit. */
    roundStrategy: RoundingStrategy;
    /** Rastros auditáveis pré-gerados. */
    audit: {
        latex: string;
        unicode: string;
        verbal: string;
    };
    /** Opções de saída ativas. */
    options: Readonly<Toptions>;
    /** Referências prontas para uso dos métodos de exportação da classe. */
    methods: Pick<
        CalcAUYOutput,
        | "toStringNumber"
        | "toFloatNumber"
        | "toScaledBigInt"
        | "toRawInternalNumber"
        | "toLiveTrace"
        | "toMonetary"
        | "toLaTeX"
        | "toUnicode"
        | "toMermaidGraph"
        | "toVerbalA11y"
        | "toSlice"
        | "toSliceByRatio"
        | "toAuditTrace"
        | "toJSON"
    >;
};

/**
 * Define a estrutura de tradução e regras de verbalização (A11y) para a CalcAUYLogic.
 *
 * **Engenharia:** Este tipo permite a internacionalização completa do rastro de auditoria
 * falado. Ao fornecer uma implementação customizada, é obrigatório preencher todos os tokens
 * para garantir que a reconstrução da frase seja fluida e sem termos indefinidos.
 */
export type CalcAUYLocaleA11y = {
    /** Código do locale (ex: "pt-BR", "en-US"). */
    locale: string;
    /** Símbolo da moeda padrão para este locale (ISO 4217). */
    currency: string;
    /** Caractere separador de decimais (ex: "," ou "."). */
    decimalSeparator: string;
    /** Termo falado para o separador decimal (ex: " vírgula " ou " point "). */
    voicedSeparator: string;
    /** Caractere separador de milhar (ex: "." ou ","). */
    thousandSeparator: string;
    /** Dicionário de tradução para operadores matemáticos. */
    operators: {
        /** Termo para adição (+). */
        add: string;
        /** Termo para subtração (-). */
        sub: string;
        /** Termo para multiplicação (*). */
        mul: string;
        /** Termo para divisão (/). */
        div: string;
        /** Termo para exponenciação (^). */
        pow: string;
        /** Termo para módulo (%). */
        mod: string;
        /** Termo para divisão inteira (//). */
        divInt: string;
        /** Termo para abertura de agrupamento. */
        group_start: string;
        /** Termo para fechamento de agrupamento. */
        group_end: string;
    };
    /** Frases e conectivos utilizados na construção da narração. */
    phrases: {
        /** Conectivo de igualdade (ex: " é igual a "). */
        isEqual: string;
        /** Termo para indicar a estratégia de arredondamento. */
        rounding: string;
        /** Preposição de alvo (ex: "para"). */
        for: string;
        /** Termo para casas decimais. */
        decimalPlaces: string;
        /** Prefixo para raiz quadrada. */
        root_square: string;
        /** Prefixo para raiz cúbica. */
        root_cubic: string;
        /** Template para raiz enésima (deve conter o placeholder {den}). */
        root_n: string;
    };
    /** Termos utilizados no Diagrama de Sequência Mermaid (Ledger-view). */
    mermaid: {
        /** Termo para Contexto (ex: "Contexto"). */
        context: string;
        /** Termo para transferência de rastro (ex: "Handover"). */
        handover: string;
        /** Termo para entrada de valor (ex: "Ingestão"). */
        ingestion: string;
        /** Termo para entrada em lote (ex: "Ingestão de Operandos"). */
        ingestionOperands: string;
        /** Termo para cálculo (ex: "Operação"). */
        operation: string;
        /** Termo para evento de controle (ex: "Evento"). */
        event: string;
        /** Termo para fechamento (ex: "Fechamento e Assinatura Final"). */
        closing: string;
        /** Termo para o rastro digital (ex: "Signature"). */
        signature: string;
        /** Termo para o dia atual (ex: "Hoje"). */
        today: string;
        /** Label para metadados do tipo Objeto. */
        objectLabel: string;
        /** Template para metadados do tipo Lista (deve conter {n}). */
        listTemplate: string;
    };
};
