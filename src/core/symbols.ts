/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Símbolos internos para controle de segurança e testes.
 * ESTE ARQUIVO NÃO DEVE SER EXPORTADO NO mod.ts
 */

/**
 * Chave privada para injeção de timestamp de nascimento em ambientes de teste.
 * Permite garantir assinaturas determinísticas em suítes de teste.
 */
export const BIRTH_TICKET_MOCK: unique symbol = Symbol("BIRTH_TICKET_MOCK");
