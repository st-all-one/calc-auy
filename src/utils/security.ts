/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { crypto } from "@std/crypto";
import { encodeHex } from "@std/encoding/hex";
import { encodeBase64 } from "@std/encoding/base64";
import { encodeBase32 } from "@std/encoding/base32";
import { encodeBase58 } from "@std/encoding/base58";
import type { SignatureEncoder } from "./sanitizer.ts";

/**
 * Serializa um valor para string canônica segundo RFC 8785 (JSON Canonicalization Scheme — JCS).
 *
 * Type guards rejeitam tipos não-JSON que causariam assinatura silenciosamente divergente:
 * BigInt, Date, function, symbol, Infinity, NaN, undefined como valor raiz.
 *
 * Regras JCS:
 * - `null` → `null`
 * - `boolean` → `true` / `false`
 * - `number` → formato decimal canônico, sem expoente, sem zeros à esquerda/direita
 * - `string` → JSON string escapado (U+0022, U+005C, U+0000–U+001F)
 * - `Array` → `[...]` sem whitespace extra
 * - `Object` → chaves ordenadas por UTF-8 code point, sem whitespace
 * - `undefined` em valor de objeto → chave omitida
 */
export function canonicalString(data: unknown): string {
    const parts: string[] = [];
    serialize(parts, data, 0);
    return parts.join("");
}

const MAX_SERIALIZE_DEPTH = 1000;

/**
 * Expande notação científica (ex: `1e+21`) para decimal literal (`1000000000000000000000`).
 * Segue o algoritmo exigido por RFC 8785 — IEEE 754 doubles que toString() representa
 * com expoente são expandidos para sua forma decimal mínima.
 */
function expandScientificNotation(s: string): string {
    const match = s.match(/^(-?)(\d)(?:\.(\d*))?[eE]([+-]?\d+)$/);
    if (!match) {
        throw new TypeError(`Cannot expand scientific notation: ${s}`);
    }

    const [, sign, intDigit, fracPart, expStr] = match;
    const exp = parseInt(expStr, 10);
    const digits = intDigit + (fracPart ?? "");
    const decimalShift = exp - (fracPart?.length ?? 0);

    if (decimalShift >= 0) {
        return sign + digits + "0".repeat(decimalShift);
    }

    const absShift = -decimalShift;
    if (absShift < digits.length) {
        const insertAt = digits.length - absShift;
        let result = sign + digits.slice(0, insertAt) + "." + digits.slice(insertAt);
        result = result.replace(/(\..*?)0+$/, "$1");
        result = result.replace(/\.$/, "");
        return result;
    }

    const leadingZeros = "0".repeat(absShift - digits.length);
    let result = sign + "0." + leadingZeros + digits;
    result = result.replace(/(\..*?)0+$/, "$1");
    return result;
}

/**
 * Serializa um número seguindo as regras de RFC 8785:
 * - Sem expoente (notação científica expandida)
 * - Sem zeros à esquerda
 * - Sem zeros à direita após ponto decimal
 * - Sem ponto decimal para inteiros
 * - `-0` → `0`
 */
function serializeNumber(n: number): string {
    if (!Number.isFinite(n)) {
        throw new TypeError(
            `Cannot canonicalize non-finite number: ${
                n === Infinity ? "Infinity" : n === -Infinity ? "-Infinity" : "NaN"
            }`,
        );
    }

    const s = n.toString();

    if (Object.is(n, -0)) { return "0"; }

    if (s.includes("e") || s.includes("E")) {
        return expandScientificNotation(s);
    }

    return s;
}

function serialize(parts: string[], data: unknown, depth: number): void {
    if (depth > MAX_SERIALIZE_DEPTH) {
        throw new TypeError("Excessive depth in canonicalString");
    }
    const nd = depth + 1;

    if (data === null) {
        parts.push("null");
    } else if (typeof data === "boolean") {
        parts.push(data ? "true" : "false");
    } else if (typeof data === "number") {
        parts.push(serializeNumber(data));
    } else if (typeof data === "string") {
        parts.push(JSON.stringify(data));
    } else if (Array.isArray(data)) {
        parts.push("[");
        for (let i = 0; i < data.length; i++) {
            if (i > 0) { parts.push(","); }
            serialize(parts, data[i], nd);
        }
        parts.push("]");
    } else if (typeof data === "object" && data !== null) {
        // type guards — rejeita wrapper objects que distorceriam a canônica
        if (data instanceof Date || data instanceof RegExp) {
            const typeName = data instanceof Date ? "Date" : "RegExp";
            throw new TypeError(`"${typeName}" values are not allowed in canonical data; convert to string first`);
        }

        parts.push("{");
        const keys = Object.keys(data as Record<string, unknown>).sort();
        let first = true;
        for (const key of keys) {
            const val = (data as Record<string, unknown>)[key];
            if (val === undefined) { continue; }
            if (!first) { parts.push(","); }
            parts.push(JSON.stringify(key));
            parts.push(":");
            serialize(parts, val, nd);
            first = false;
        }
        parts.push("}");
    } else {
        // bigint, function, symbol — rejeita para evitar assinatura divergente
        const typeName = typeof data;
        throw new TypeError(
            `Values of type "${typeName}" are not allowed in canonical data`,
        );
    }
}

/**
 * Gera uma assinatura digital BLAKE3 com a codificação escolhida.
 *
 * @param data Conteúdo a ser assinado.
 * @param salt Sal secreto da instância.
 * @param encoderType Tipo de codificação (HEX, BASE64, BASE58, BASE32).
 * @returns Assinatura digital formatada.
 */
export async function generateSignature(
    data: unknown,
    salt: string,
    encoderType: SignatureEncoder,
): Promise<string> {
    const cString = canonicalString(data);
    const encoder = new TextEncoder();
    const payload = encoder.encode(cString + salt);

    const hashBuffer = await crypto.subtle.digest("BLAKE3", payload);
    const uint8 = new Uint8Array(hashBuffer);

    switch (encoderType) {
        case "BASE64":
            return encodeBase64(uint8);
        case "BASE32":
            return encodeBase32(uint8);
        case "BASE58":
            return encodeBase58(uint8);
        case "HEX":
        default:
            return encodeHex(uint8);
    }
}
