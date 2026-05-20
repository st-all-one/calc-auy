import type { ColumnType } from "kysely";
import type { ASTTypes } from "~internal-types";

/**
 * Schema oficial da CalcAUY para o Query Builder Kysely.
 *
 * Este schema define a estrutura da tabela que armazena os Rastros de Auditoria
 * (Audit Traces) assinados pela biblioteca.
 */
export interface CalcAUYDatabase {
    calc_audit_trace: CalcAuditTraceTable;
}

/**
 * Tipo utilitário para facilitar a criação de colunas imutáveis (Append-Only).
 * Evita acidentalmente disparar updates nas evidências forenses pelo Kysely.
 */
type Immutable<SelectType, InsertType = SelectType> = ColumnType<SelectType, InsertType, never>;

export interface CalcAuditTraceTable {
    /** UUID (v7) do registro de auditoria */
    id: Immutable<string, string | undefined>;

    /** A assinatura digital BLAKE3 gerada pelo método commit() */
    signature: Immutable<string>;

    /** Jurisdição/Contexto isolado onde o cálculo foi executado */
    context_label: Immutable<string>;

    /** Estratégia de arredondamento aplicada no final (ex: NBR-5891) */
    round_strategy: Immutable<string>;

    /**
     * Numerador do resultado final como String.
     * BigInts são armazenados como string (VARCHAR ou NUMERIC)
     * para evitar truncamento por limites inteiros de SQL.
     */
    final_result_n: Immutable<string>;

    /**
     * Denominador do resultado final como String.
     */
    final_result_d: Immutable<string>;

    /**
     * A Árvore de Sintaxe Abstrata completa em formato JSON/JSONB.
     * O driver de banco de dados e Kysely cuidarão da serialização.
     */
    ast: Immutable<ASTTypes.CalculationNode>;

    /** Data de criação e registro da evidência forense */
    created_at: Immutable<Date, string | Date | undefined>;
}
