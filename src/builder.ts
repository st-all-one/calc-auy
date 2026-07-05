/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
    CalculationNode,
    ControlNode,
    GroupNode,
    LiteralNode,
    MetadataValue,
    OperationType,
    RationalValue,
    SerializedCalculation,
} from "./ast/types.ts";
import { RationalNumber } from "./core/rational.ts";
import { validateMetadata } from "./core/metadata.ts";
import type { RoundingStrategy } from "./core/constants.ts";
import { evaluate } from "./ast/engine.ts";
import { CalcAUYOutput } from "./output.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";
import { attachOp, flattenASTMetadata, validateASTNode } from "./ast/builder_utils.ts";
import { getSubLogger, startSpan } from "./utils/logger.ts";
import { sanitizeAST, type SignatureEncoder } from "./utils/sanitizer.ts";
import { generateSignature } from "./utils/security.ts";
import { CalcAUYError } from "./core/errors.ts";
import type { InstanceConfig } from "./core/types.ts";
import { BIRTH_TICKET_MOCK } from "./core/constants.ts";

const logger = getSubLogger("engine");

/**
 * Automated cleanup registry for the global AST literal node cache.
 */
const astCacheRegistry = new FinalizationRegistry<string>((key) => {
    globalLiteralNodeCache.delete(key);
});

/**
 * Hot Cache - Strong references for high-frequency AST nodes.
 */
const hotLiteralNodeCache = new Map<string, LiteralNode>();
const HOT_CACHE_LIMIT = 512;

/**
 * Intelligent Global Cache for reusing "clean" literal nodes.
 *
 * Uses Weak References to allow the Garbage Collector to free AST nodes
 * that are no longer part of any active calculation tree.
 */
const globalLiteralNodeCache = new Map<string, WeakRef<LiteralNode>>();

export type InputValue<C extends string, P extends InstanceConfig = InstanceConfig> =
    | string
    | number
    | bigint
    | CalcAUYLogic<C, P>;

/**
 * CalcAUYLogic - Fluent Builder for `Abstract Syntax Tree (AST)` Construction.
 *
 * This class employs the Builder pattern to accumulate arithmetic operations into
 * an immutable tree structure. It ensures strict isolation via branding and symbols.
 *
 * @class
 */
export class CalcAUYLogic<Context extends string, Config extends InstanceConfig = InstanceConfig> {
    readonly #ast: CalculationNode | null;
    readonly #instanceId: symbol;
    readonly #config: Required<InstanceConfig>;
    readonly #birthTime: string | null;
    readonly #metadataSize: number;

    // Branding for IDE: Prevents mixing instances with different labels or configurations
    // @ts-ignore: Branding field
    readonly #__context!: Context;
    // @ts-ignore: Branding field
    readonly #__config_brand!: Config;

    /** @internal */
    constructor(
        ast: CalculationNode | null,
        instanceId: symbol,
        config: Required<InstanceConfig>,
        birthTime: string | null,
        metadataSize = 0,
    ) {
        this.#ast = ast;
        this.#instanceId = instanceId;
        this.#config = config;
        this.#birthTime = birthTime;
        this.#metadataSize = metadataSize;
    }

    /**
     * Initializes a calculation from a numeric value, string, or another instance.
     *
     * @param value - The input value to start the calculation.
     * @returns A new CalcAUYLogic instance.
     *
     * **Inputs allowed:**
     * ```ts
     * // String numbers
     * "1230"        // 1230.00
     * "1230.45"     // 1230.45
     * "1_230.45"    // 1230.45
     * "1_230.4_536" // 1230.4536
     * "1e3"         // 100.00
     * "100e-3"      // 0.10
     *
     * // Pure numbers
     * 1230         // 1230.00
     * 1230.45      // 1230.45
     * 1_230.45     // 1230.45
     * 1_230.4_536  // 1230.4536
     * 1e3          // 100.00
     * 100e-3       // 0.10
     *
     * // Percent numbers
     * "14%"        // 14/100
     * "-14%"       // -14/100
     * "14.5%"      // 145/1000
     * "-14.5%"     // -145/1000
     *
     * // Rational Numbers
     * "3/7"        // 3/7 => 0.428571...
     * "-3/7"       // -3/7 => -0.428571...
     * "-3/-7"      // 3/7 => 0.428571...
     *
     * // Left-zero ommited notation
     * ".53"        // 0.53
     * "-.53"       // -0.53
     * "+.53"       // 0.53
     * ".5_3456"    // 0.53456
     * ```
     *
     * @example
     * ```ts
     * CalcAUY.create({contextLabel:"x"}).from("1200.75")
     * ```
     */
    public from(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        if (value instanceof CalcAUYLogic) {
            this.validateInstance(value);
            // If the current instance is empty, adopt the AST of the received instance
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(value.#ast, this.#instanceId, this.#config, value.#birthTime);
            }
            return value;
        }

        let inputStr: string;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed.endsWith("%")) {
                inputStr = `${trimmed.slice(0, -1).replace(/_/g, "")}/100`;
            } else {
                inputStr = value;
            }
        } else {
            inputStr = value.toString();
        }

        // Priority 1: Hot Cache (Strong References)
        const hotCached = hotLiteralNodeCache.get(inputStr);
        if (hotCached) {
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(
                    hotCached,
                    this.#instanceId,
                    this.#config,
                    this.#generateBirthTime(),
                );
            }
            return this.op("add", value);
        }

        // Priority 3: Cold Cache (WeakRef)
        const globalRef = globalLiteralNodeCache.get(inputStr);
        const globalCached = globalRef?.deref();
        if (globalCached) {
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(
                    globalCached,
                    this.#instanceId,
                    this.#config,
                    this.#generateBirthTime(),
                );
            }
            if (hotLiteralNodeCache.size < HOT_CACHE_LIMIT) {
                hotLiteralNodeCache.set(inputStr, globalCached);
            }
            return this.op("add", value);
        }

        const newNode = this.#createBaseNode(inputStr);

        if (hotLiteralNodeCache.size < HOT_CACHE_LIMIT) {
            hotLiteralNodeCache.set(inputStr, newNode);
        }
        globalLiteralNodeCache.set(inputStr, new WeakRef(newNode));
        astCacheRegistry.register(newNode, inputStr);

        if (this.#ast === null) {
            return new CalcAUYLogic<Context, Config>(
                newNode,
                this.#instanceId,
                this.#config,
                this.#generateBirthTime(),
            );
        }

        return this.op("add", value);
    }

    /**
     * Parses a mathematical expression string into an AST.
     *
     * Note: The parser only accepts numeric literals and operators. To use dynamic
     * variables, employ string interpolation.
     *
     * @param expression - The string expression (e.g., "10 + (5 * 2)").
     * @returns A new CalcAUYLogic instance.
     *
     * @example Financial: Fixed Interest Formula
     * ```ts
     * const Finance = CalcAUY.create({ contextLabel: "loan-logic", salt: "bank-salt" });
     *
     * // Using a literal string for a standard fixed-rate formula
     * const result = await Finance.parseExpression("1000 * (1 + 0.15)^3").commit();
     * ```
     *
     * @example Healthcare: Dynamic BMI Calculation
     * ```ts
     * const Clinic = CalcAUY.create({ contextLabel: "diagnostics", salt: "lab-salt" });
     * const weight = 85.5;
     * const height = 1.82;
     *
     * // Using string interpolation to inject dynamic data into the formula
     * const bmi = await Clinic.parseExpression(`${weight} / ${height}^2`).commit();
     * ```
     */
    public parseExpression(expression: string): CalcAUYLogic<Context, Config> {
        const lexer: Lexer = new Lexer(expression);
        const tokens = lexer.tokenize();
        const parser: Parser = new Parser(tokens);
        const newNode = parser.parse();

        if (this.#ast === null) {
            return new CalcAUYLogic<Context, Config>(
                newNode,
                this.#instanceId,
                this.#config,
                this.#generateBirthTime(),
            );
        }

        // If AST already exists, add the expression to the current tree
        return this.add(new CalcAUYLogic<Context, Config>(newNode, this.#instanceId, this.#config, this.#birthTime));
    }

    /**
     * Reconstructs a calculation from a saved state and validates its integrity.
     *
     * @param ast - The signed audit trace or hibernation state.
     * @param config - Optional security override for cross-context rehydration.
     * @returns A rehydrated CalcAUYLogic instance.
     *
     * @example Didactic: Finalizing a Draft and Resuming for Audit
     * ```ts
     * const System = CalcAUY.create({ contextLabel: "workflow", salt: "k-123" });
     *
     * // Step 1: Initialize a calculation and save it as a signed draft (Hibernation)
     * const draft = await System.from(5000).add(250).hibernate();
     *
     * // Step 2: Some time later, re-hydrate the draft to finish the work
     * const resumed = await System.hydrate(draft);
     * const result = await resumed.mult("10%").commit();
     *
     * console.log(result.toUnicode()); // roundₙᵦᵣ₋₅₈₉₁((5000 + 250) × 10%, 2) = 525.00
     * ```
     *
     * @example Security: Automatic Integrity Breach Detection
     * ```ts
     * const Vault = CalcAUY.create({ contextLabel: "security", salt: "vault-salt" });
     *
     * try {
     *   const signedData = JSON.parse(await Vault.from(100).hibernate());
     *
     *   // FRAUD ATTEMPT: Changing the value inside the signed Abstract Syntax Tree
     *   signedData.ast.value.n = "999999";
     *
     *   // hydrate() validates the signature bit-by-bit before re-animating the calculation.
     *   // This will throw a critical integrity violation error.
     *   await Vault.hydrate(signedData);
     * } catch (err) {
     *   if (err instanceof CalcAUYError && err.title === "integrity-critical-violation") {
     *     console.error("CRITICAL: Tampering detected! System trace is no longer valid.");
     *   }
     * }
     * ```
     */
    public async hydrate(
        ast: CalculationNode | string | object,
        config: { salt?: string; encoder?: SignatureEncoder } = {},
    ): Promise<CalcAUYLogic<Context, Config>> {
        const payload: SerializedCalculation = typeof ast === "string" ? JSON.parse(ast) : ast as SerializedCalculation;
        const signature = payload.signature;

        if (!signature) {
            throw new CalcAUYError("integrity-critical-violation", "Signature missing during hydration.");
        }

        const verificationSalt = config.salt ?? this.#config.salt;
        const verificationEncoder = config.encoder ?? this.#config.encoder;

        // Verification Data Decision:
        // If the payload contains result and strategy, it is an Audit Trace (Signed as envelope)
        // Otherwise, it is a hibernation trace (Signed as pure AST)
        const isAuditTrace = payload.finalResult !== undefined && payload.roundStrategy !== undefined;
        const dataToVerify = isAuditTrace
            ? {
                ast: payload.ast,
                finalResult: payload.finalResult,
                roundStrategy: payload.roundStrategy,
            }
            : payload.ast;

        const expectedHash = await generateSignature(dataToVerify, verificationSalt, verificationEncoder);
        if (signature !== expectedHash) {
            throw new CalcAUYError("integrity-critical-violation", "Integrity violation during hydration.");
        }

        const node: CalculationNode = payload.ast;
        validateASTNode(node);

        // Extract the original birthTime if available in the root metadata
        const originalBirthTime = node.metadata?.timestamp as string | undefined;

        // Wrap in control node (reanimation event)
        const controlNode: ControlNode = {
            kind: "control",
            type: "reanimation_event",
            metadata: {
                previousContextLabel: payload.contextLabel || "",
                previousSignature: signature,
                previousRoundStrategy: payload.roundStrategy || "",
            },
            child: node,
        };

        // Automatic Grouping: Ensure hydrated calculations are treated as a single unit
        const group: GroupNode = { kind: "group", child: controlNode };

        return new CalcAUYLogic<Context, Config>(
            group,
            this.#instanceId,
            this.#config,
            originalBirthTime || null,
        );
    }

    /**
     * Captures and serializes the current tree into a signed JSON string for persistence.
     *
     * @returns A signed JSON representation of the AST.
     *
     * @example Financial: Tax Compliance Workflow (Draft Stage)
     * ```ts
     * const Sales = CalcAUY.create({ contextLabel: "sales-tax", salt: "audit-secret" });
     *
     * // Build a complex calculation with business context and metadata
     * const pendingCalculation = Sales.from(150000.75)
     *     .add("1.5%") // Service fee
     *     .setMetadata("ref", "Service invoice #992")
     *     .mult(Sales.from(1).sub("0.12")) // Deducting tax exemption
     *     .setMetadata("approved_by", "system-auto");
     *
     * // Hibernate the calculation as a signed draft for manager review
     * const signedDraft = await pendingCalculation.hibernate();
     * ```
     *
     * @example Healthcare: Multi-Stage Drug Calibration Protocol
     * ```ts
     * const Lab = CalcAUY.create({ contextLabel: "drug-calibration", salt: "lab-vault-01" });
     *
     * // Calculate dose based on body surface area (BSA) and kidney function
     * const protocol = Lab.from(500) // Base dosage in mg
     *     .mult(Lab.from(1.73).div(1.85)) // BSA correction factor
     *     .setMetadata("patient_bsa", "1.85m²")
     *     .group()
     *     .mult("0.85"); // Kidney function adjustment factor
     *
     * // Save state to allow a second specialist to verify before final commitment
     * const validationState = await protocol.hibernate();
     * ```
     */
    public async hibernate(): Promise<string> {
        const root = this.assertAST();

        // Flatten metadata chain for signing and serialization
        // IMPORTANT: We flatten BEFORE injecting the timestamp to avoid prototype loss during spread
        const flattenedRoot = flattenASTMetadata(root);

        // Inject the birth ticket only during closure
        const ast = this.#birthTime
            ? {
                ...flattenedRoot,
                metadata: { ...flattenedRoot.metadata, timestamp: this.#birthTime },
            } as CalculationNode
            : flattenedRoot;

        const signature = await generateSignature(ast, this.#config.salt, this.#config.encoder);
        const payload: SerializedCalculation = {
            ast,
            signature,
            contextLabel: this.#config.contextLabel,
        };
        return JSON.stringify(payload);
    }

    /**
     * Incorporates a calculation from an external instance (cross-context).
     *
     * This method acts as a secure gateway to merge calculations from different
     * jurisdictions or instances, validating integrity and preserving lineage.
     *
     * @param externalInstance - The external CalcAUYLogic instance or signed trace.
     * @returns A new CalcAUYLogic instance with the external calculation attached.
     *
     * @example Financial: Corporate Consolidated Audit (Branch to HQ)
     * ```ts
     * // 1. Regional Branch Context (Independent security jurisdiction)
     * const Branch = CalcAUY.create({ contextLabel: "branch-ny", salt: "branch-secret" });
     * const branchSubtotal = Branch.from(1000000).sub(250000).setMetadata("dept", "sales");
     *
     * // 2. Corporate HQ Context (Master audit jurisdiction)
     * const HQ = CalcAUY.create({ contextLabel: "corporate-hq", salt: "hq-master-salt" });
     *
     * // HQ incorporates the branch's signed subtotal without needing their salt.
     * // fromExternalInstance validates the branch's signature and stamps its origin.
     * const consolidation = await HQ.fromExternalInstance(branchSubtotal);
     *
     * // Now HQ adds corporate-level overheads to the branch's result
     * const finalLedger = await consolidation.mult(HQ.from(1).add("2.5%").setMetadata("obs", "Security overhead")).commit();
     *
     * console,log(finalLedger.toMonetary({ locale: "en-US" })) // $768,750.00
     * ```
     *
     * @example Legal: Appellate Chain of Custody (Lower Court to High Court)
     * ```ts
     * // 1. Lower Court Verdict (Original Signed Evidence)
     * const Court_A = CalcAUY.create({ contextLabel: "regional-court", salt: "justice-key-1" });
     * const basePenalty = Court_A.from(30).setMetadata("reason", "standard-theft");
     * const verdict_A = await basePenalty.hibernate(); // Exported as signed JSON string
     *
     * // 2. High Court Review (Applying legal multipliers)
     * const Court_B = CalcAUY.create({ contextLabel: "appellate-court", salt: "justice-key-2", sensitive: false });
     *
     * // The High Court imports the signed verdict from Court A.
     * // The forensic lineage is preserved: Court B builds upon Court A's logic.
     * const appealReview = await Court_B.fromExternalInstance(verdict_A);
     *
     * // High Court applies a recidivism multiplier based on the imported evidence
     * const finalVerdict = await appealReview.mult(1.5).setMetadata("aggravator", "recidivism").commit();
     * console.log(finalVerdict.toMermaidGraph({ locale: "fr-FR" }))
     * // sequenceDiagram
     * //     autonumber
     * //     participant Ctx_regional_court as Contexte: regional-court
     * //     participant Ctx_appellate_court as Contexte: appellate-court
     * //
     * //     activate Ctx_regional_court
     * //     Note over Ctx_regional_court: 26-05-03 00:20 (UTC)<br/>Ingestion: 30<br/>[reason: standard-theft]
     * //     activate Ctx_appellate_court
     * //     Ctx_regional_court->>+Ctx_appellate_court: Passage (Sig: 8cc47c58...)
     * //     deactivate Ctx_regional_court
     * //     Note over Ctx_appellate_court: Événement: reanimation_event
     * //     Note over Ctx_appellate_court: Ingestion: 1.5
     * //     Ctx_appellate_court->>Ctx_appellate_court: Opération: mul<br/>[aggravator: recidivism]
     * //     Note over Ctx_appellate_court: 26-05-03 00:20 (UTC)<br/>Clôture et Signature Finale<br/>Signature: (Sig: bad4ebc0...)
     * //     deactivate Ctx_appellate_court
     *
     * ```
     */
    public async fromExternalInstance(
        externalInstance: CalcAUYLogic<string, InstanceConfig> | string | object,
    ): Promise<CalcAUYLogic<Context, Config>> {
        let externalAST: CalculationNode;
        let externalSignature: string;
        let externalContextLabel = "";
        let externalStrategy = "";
        let externalBirthTime: string | null = null;

        if (externalInstance instanceof CalcAUYLogic) {
            // Live Instance: Close with immediate signature and validate
            const hibernated = await externalInstance.hibernate();
            const payload: SerializedCalculation = JSON.parse(hibernated);
            // deno-lint-ignore no-non-null-assertion
            externalAST = payload.ast!;
            externalSignature = payload.signature;
            const extConfig = externalInstance.#config;
            externalContextLabel = extConfig.contextLabel;
            externalStrategy = extConfig.roundStrategy || "";
            externalBirthTime = (externalAST.metadata?.timestamp as string) || null;
        } else {
            // Object or serialized JSON
            const payload: SerializedCalculation = typeof externalInstance === "string"
                ? JSON.parse(externalInstance)
                : externalInstance as SerializedCalculation;
            if (!payload.signature) {
                throw new CalcAUYError(
                    "integrity-critical-violation",
                    "External instance missing integrity signature.",
                );
            }
            // deno-lint-ignore no-non-null-assertion
            externalAST = payload.ast!;
            externalSignature = payload.signature;
            externalContextLabel = payload.contextLabel || "";
            externalStrategy = payload.roundStrategy || "";
            // Basic structural validation
            validateASTNode(externalAST);
            externalBirthTime = (externalAST.metadata?.timestamp as string) || null;
        }

        // Jurisdiction Stamp (Original lineage preserved)
        const controlNode: ControlNode = {
            kind: "control",
            type: "reanimation_event",
            metadata: {
                previousContextLabel: externalContextLabel,
                previousSignature: externalSignature,
                previousRoundStrategy: externalStrategy,
            },
            child: externalAST,
        };

        if (this.#ast === null) {
            // If it's the starting point, inherit the birth time from the external instance or generate a new one
            const birth = externalBirthTime || this.#generateBirthTime();
            // Automatic Grouping: Ensure external calculations are treated as a single unit
            const group: GroupNode = { kind: "group", child: controlNode };
            return new CalcAUYLogic<Context, Config>(group, this.#instanceId, this.#config, birth);
        }

        // Union via special operation, wrapped in a group for safety
        const group: GroupNode = { kind: "group", child: controlNode };
        const newAST = attachOp(this.assertAST(), "crossContextAdd", group);

        return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime);
    }

    /**
     * Attaches domain-specific metadata to the current calculation node.
     *
     * This is the core feature that enables forensic auditability. Metadata allows you to
     * justify the `"why"` behind every number and operation, effectively creating a
     * mathematical narrative that remains attached to the result forever.
     *
     * This method is particularly useful for ensuring the rationale behind each value,
     * facilitating the continuous application of business rules with the assurance of
     * having a valid justification within the result itself.
     *
     * Supports any JSON-serializable value: `string`, `number`, `boolean`, `object`, or `array`.
     *
     * @param key - The metadata identifier.
     * @param value - The metadata value (JSON-compatible).
     * @returns A new CalcAUYLogic instance with metadata attached to the latest node.
     *
     * @example Financial: Loan Projection with multi-layered justifications
     * ```ts
     * const Finance = CalcAUY.create({ contextLabel: "loan-engine", salt: "bank-secret" });
     *
     * const loan = Finance.from(50000)
     *     .setMetadata("label", "Principal Amount")
     *     .setMetadata("contract_id", "CNT-2026-X9")
     *     .mult(
     *         Finance.from(1).add("5.25%").setMetadata("index", "SELIC + 2% Spread")
     *     )
     *     .setMetadata("risk_adjustment", { score: 750, factor: 0.05 })
     *     .add(150)
     *     .setMetadata("operational_fees", ["Origination Fee", "Insurance Premium"])
     *     .setMetadata("audit_trace", { ip: "10.0.0.1", user_id: "agent_42" });
     *
     * const finalTrace = await loan.commit();
     * ```
     *
     * @example Legal: Tax Assessment with statutory grounding
     * ```ts
     * const Judiciary = CalcAUY.create({ contextLabel: "tax-litigation", salt: "justice-key" });
     *
     * const settlement = Judiciary.from(15000)
     *     .setMetadata("subject", "Unpaid services indemnity")
     *     .mult("5%")
     *     .setMetadata("tax_logic", {
     *         tax_name: "Service Tax (ISS)",
     *         legal_basis: "Complementary Law No. 116/2003",
     *         justification: "Article 1, §1 - Service provision within municipal limits"
     *     })
     *     .add(Judiciary.from(15000).mult("1%"))
     *     .setMetadata("legal_basis", "Arrears Interest - Civil Code Art. 406")
     *     .setMetadata("case_id", "STJ-2026-X88")
     *     .setMetadata("status", "final_audit_pending");
     * ```
     *
     * @example Healthcare: Pediatric ICU Weight-Based Dosage Safety
     * ```ts
     * const Hospital = CalcAUY.create({ contextLabel: "icu-safety", salt: "lab-vault" });
     *
     * const dose = Hospital.from(12.5)
     *     .setMetadata("patient_weight_kg", 12.5)
     *     .mult(0.15)
     *     .setMetadata("dosage_guideline", "WHO Pediatric Standard v4.2")
     *     .setMetadata("mg_per_kg", 0.15)
     *     .mult(0.85)
     *     .setMetadata("renal_correction", {
     *         creatinine_clearance: "low",
     *         adjustment_applied: 0.85
     *     })
     *     .setMetadata("drug_info", {
     *         name: "Vancomycin",
     *         lot: "EXP-2027-04",
     *         verified_by: ["dr_smith", "nurse_ratched"]
     *     });
     *
     * const output = await dose.commit();
     * console.log(output.toAuditTrace());
     * // This method  is particel
     * ```
     */
    public setMetadata(key: string, value: MetadataValue): CalcAUYLogic<Context, Config> {
        const valSize = validateMetadata(value);
        const keySize = key.length * 2;
        const totalSize = this.#metadataSize + valSize + keySize;

        const ast = this.assertAST();
        const newAST: CalculationNode = {
            ...ast,
            metadata: Object.assign(Object.create(ast.metadata || null), { [key]: value }),
        } as CalculationNode;

        if (logger.isEnabledFor("debug")) {
            logger.debug("Metadata Attached", {
                key,
                // Avoid sanitizing the whole tree in every step if it's just metadata attachment
                // structure: sanitizeAST(newAST, this.#config),
            });
        }

        return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime, totalSize);
    }

    /**
     * Wraps the current expression in a group (parentheses).
     *
     * @returns A new CalcAUYLogic instance representing the grouped expression.
     *
     * @example Ensuring Priority for Tax Addition
     * ```ts
     * Finance.from(100).add(50).group().mult(2); // (100 + 50) * 2 = 300
     * ```
     */
    public group(): CalcAUYLogic<Context, Config> {
        const ast = this.assertAST();
        if (ast.kind === "group" || ast.kind === "literal") {
            return this;
        }

        const node: GroupNode = {
            kind: "group",
            child: ast,
        };

        if (logger.isEnabledFor("debug")) {
            logger.debug("Grouping Applied", {
                structure: sanitizeAST(node, this.#config),
            });
        }

        return new CalcAUYLogic<Context, Config>(node, this.#instanceId, this.#config, this.#birthTime);
    }

    // --- Fluent Operations ---

    /** Adds a value. @see from for input types. */
    public add(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("add", value);
    }
    /** Subtracts a value. @see from for input types. */
    public sub(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("sub", value);
    }
    /** Multiplies by a value. @see from for input types. */
    public mult(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("mul", value);
    }
    /** Divides by a value. @see from for input types. */
    public div(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("div", value);
    }
    /** Raises to a power. @see from for input types. */
    public pow(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("pow", value);
    }
    /** Remainder of division. @see from for input types. */
    public mod(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("mod", value);
    }
    /** Integer division. @see from for input types. */
    public divInt(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("divInt", value);
    }

    /**
     * Ensures the AST is initialized.
     * @private
     */
    private assertAST(): CalculationNode {
        if (this.#ast === null) {
            throw new CalcAUYError(
                "invalid-syntax",
                "Calculation not initialized. Use .from() or .parseExpression() as a starting point.",
            );
        }
        return this.#ast;
    }

    /**
     * Validates that the provided instance belongs to the same context.
     * @private
     */
    private validateInstance(other: CalcAUYLogic<string, InstanceConfig>): void {
        if (other.#instanceId !== this.#instanceId) {
            throw new CalcAUYError(
                "instance-mismatch",
                `Attempted to mix instances from different contexts. Use 'fromExternalInstance' for cross-context integration.`,
                {
                    currentContext: this.#config.contextLabel,
                    otherContext: other.#config.contextLabel,
                },
            );
        }
    }

    /**
     * Generates birth timestamp following mock rules.
     * @private
     */
    #generateBirthTime(): string {
        return (this.#config[BIRTH_TICKET_MOCK] as string) || new Date().toISOString();
    }

    /**
     * Centralized helper for creating literal base nodes.
     * @private
     */
    #createBaseNode(input: string): LiteralNode {
        const r: RationalNumber = RationalNumber.from(input);
        return {
            kind: "literal",
            value: r.toJSON() as RationalValue,
            originalInput: input,
        };
    }

    /**
     * Internal method to attach operations to the tree.
     * @private
     */
    private op(type: OperationType, value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        const ast = this.assertAST();
        let rightNode: CalculationNode;
        let inputType: string;

        if (value instanceof CalcAUYLogic) {
            this.validateInstance(value);
            const innerAST = value.assertAST();
            if (innerAST.kind === "group" || innerAST.kind === "literal") {
                rightNode = innerAST;
            } else {
                rightNode = { kind: "group", child: innerAST };
            }
            inputType = "CalcAUYLogic";
        } else {
            const r: RationalNumber = RationalNumber.from(value);
            rightNode = {
                kind: "literal",
                value: r.toJSON() as RationalValue,
                originalInput: value.toString(),
            };
            inputType = typeof value;
        }

        const newAST: CalculationNode = attachOp(ast, type, rightNode);

        if (logger.isEnabledFor("debug")) {
            logger.debug("Node appended to AST", {
                operation: type,
                input_type: inputType,
                structure: sanitizeAST(newAST, this.#config),
            });
        }

        return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime);
    }

    /**
     * Finalizes the tree construction and begins the evaluation phase.
     *
     * @returns A CalcAUYOutput container with results and audit traces.
     *
     * @example Committing a Finalized Transaction
     * ```ts
     * const result = await payment.commit();
     * ```
     */
    public async commit(): Promise<CalcAUYOutput> {
        using _span = startSpan("commit", logger);
        const root = this.assertAST();

        // Flatten metadata chain for signing and serialization
        // IMPORTANT: We flatten BEFORE injecting the timestamp to avoid prototype loss during spread
        const flattenedRoot = flattenASTMetadata(root);

        // Inject the birth ticket only during closure
        const ast = this.#birthTime
            ? {
                ...flattenedRoot,
                metadata: { ...flattenedRoot.metadata, timestamp: this.#birthTime },
            } as CalculationNode
            : flattenedRoot;

        const roundStrategy: RoundingStrategy = this.#config.roundStrategy;
        const result: RationalNumber = evaluate(ast);

        // Generate integrity signature for the consolidated result (Fixed AST + Result)
        const payload = {
            ast,
            finalResult: result.toJSON(),
            roundStrategy,
        };
        const signature = await generateSignature(payload, this.#config.salt, this.#config.encoder);

        return new CalcAUYOutput(result, ast, roundStrategy, signature, this.#config);
    }
}
