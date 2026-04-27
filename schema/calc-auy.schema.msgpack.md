---
copyright: "Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0"

copyright_message: "Copyright (c) 2026, Stallone L. S. (@st-all-one) This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/."
---

# CalcAUY - MessagePack Schema

Este documento define o mapeamento binário para a serialização da CalcAUY em MessagePack

## 0. Enums FixInt
Tipos e categorias são representados por inteiros positivos:

**NodeKind:**
- `1`: literal
- `2`: operation
- `3`: group
- `4`: control

**OperationType:**
- `1`: add
- `2`: sub
- `3`: mul
- `4`: div
- `5`: pow
- `6`: mod
- `7`: divInt
- `8`: crossContextAdd

## 1. RationalValue
- **Tipo**: Map
- **Chaves Obrigatórias**:
  - `"n"`: String (BigInt stringified)
  - `"d"`: String (BigInt stringified)

## 2. CalculationNode (Recursivo)
Representado como um Map

### Campos Comuns (Base)
- `"kind"`: Integer (Enum NodeKind - **Obrigatório**)
- `"metadata"`: Map (Opcional, não permite null/undefined)

### Campos Específicos por `kind`

#### LiteralNode (`kind: 1`)
- `"value"`: `RationalValue`
- `"originalInput"`: String

#### OperationNode (`kind: 2`)
- `"type"`: Integer (Enum OperationType)
- `"operands"`: Array de `CalculationNode` (mínimo 1 item)

#### GroupNode (`kind: 3`)
- `"child"`: `CalculationNode`

#### ControlNode (`kind: 4`)
- `"type"`: String (Fixo: "reanimation_event")
- `"child"`: `CalculationNode`
- `"previousContextLabel"`: String
- `"previousSignature"`: String
- `"previousRoundStrategy"`: String

## 3. SerializedCalculation (Raiz)
A estrutura raiz selada. Segue fielmente o contrato de integridade

- **Tipo**: Map
- **Chaves Obrigatórias**:
  - `"ast"`: `CalculationNode`
  - `"finalResult"`: `RationalValue`
  - `"roundStrategy"`: String
  - `"signature"`: String (BLAKE3 Hex)
  - `"contextLabel"`: String

## 4. MetadataValue (Estrito)
O tipo `Nil/Null` é **estritamente proibido**. Suporta:
- Boolean, Integer, Float, String (UTF-8), Array
