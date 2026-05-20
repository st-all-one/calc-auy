import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { protobufProcessor } from "@processor/protobuffer/processor.protobuffer.ts";
import protobuf from "protobufjs";

const PROTO_DEF = `
syntax = "proto3";
package calc_auy;
enum OperationType {
  OPERATION_UNSPECIFIED = 0;
  OPERATION_ADD = 1;
  OPERATION_SUB = 2;
  OPERATION_MUL = 3;
  OPERATION_DIV = 4;
  OPERATION_POW = 5;
  OPERATION_MOD = 6;
  OPERATION_DIV_INT = 7;
  OPERATION_CROSS_CONTEXT_ADD = 8;
}
message RationalValue { string n = 1; string d = 2; }
message MetadataValue {
  oneof value {
    string string_val = 1;
    double double_val = 2;
    bool bool_val = 3;
    MetadataList array_val = 4;
    MetadataMap object_val = 5;
  }
}
message MetadataList { repeated MetadataValue items = 1; }
message MetadataMap { map<string, MetadataValue> fields = 1; }
message CalculationNode {
  string kind = 1;
  map<string, MetadataValue> metadata = 2;
  oneof node_type {
    LiteralNode literal = 3;
    OperationNode operation = 4;
    GroupNode group = 5;
    ControlNode control = 6;
  }
}
message LiteralNode { RationalValue value = 1; string originalInput = 2; }
message OperationNode { OperationType type = 1; repeated CalculationNode operands = 2; }
message GroupNode { CalculationNode child = 1; }
message ControlNode { string type = 1; string previousContextLabel = 2; string previousSignature = 3; string previousRoundStrategy = 4; CalculationNode child = 5; }
message SerializedCalculation {
  CalculationNode ast = 1;
  string signature = 2;
  string contextLabel = 3;
  RationalValue finalResult = 4;
  string roundStrategy = 5;
  map<string, MetadataValue> metadata = 6;
}
`;

describe("Processor: Protobuf - Validação Forense", () => {
    it("deve garantir integridade total dos dados (PEMDAS: 100 + 50 * 2 = 200)", async () => {
        const Calc = CalcAUY.create({
            contextLabel: "jurisdicao-a",
            salt: "secret-key",
            sensitive: false,
            roundStrategy: "HALF_UP",
        });

        // 100 + 50 * 2 = 200 (Multiplicação tem precedência)
        const res = await Calc.from(100)
            .add(
                Calc.from(50).setMetadata("origem", "extra"),
            )
            .mult(2)
            .setMetadata("revisor", "Stallone")
            .commit();

        const buffer = res.toCustomOutput(protobufProcessor);

        // --- Processo de Decodificação ---
        const root = protobuf.parse(PROTO_DEF).root;
        const SerializedCalculation = root.lookupType("calc_auy.SerializedCalculation");
        const decoded = SerializedCalculation.decode(buffer);
        const plain = SerializedCalculation.toObject(decoded, {
            enums: String,
            longs: String,
            defaults: true,
            oneofs: true,
        });

        const obj = res.toLiveTrace();

        // --- 1. Validação de Raiz ---
        assertEquals(plain.signature, obj.signature);
        assertEquals(plain.contextLabel, "jurisdicao-a");
        assertEquals(plain.roundStrategy, "HALF_UP");
        assertEquals(plain.finalResult.n, "200");
        assertEquals(plain.finalResult.d, "1");

        // --- 2. Validação de Metadados Globais ---
        const meta = plain.ast.metadata;
        const revisor = meta.revisor.stringVal || meta.revisor.string_val;
        assertEquals(revisor, "Stallone");

        // --- 3. Validação da Estrutura PEMDAS na AST ---
        // A raiz deve ser uma ADIÇÃO: 100 + (50 * 2)
        const ast = plain.ast;
        assertEquals(ast.kind, "operation");
        assertEquals(ast.operation.type, "OPERATION_ADD");
        assertEquals(ast.operation.operands.length, 2);

        // Lado Esquerdo: Literal 100
        const left = ast.operation.operands[0];
        assertEquals(left.kind, "literal");
        assertEquals(left.literal.value.n, "100");

        // Lado Direito: Operação MUL (50 * 2)
        const right = ast.operation.operands[1];
        assertEquals(right.kind, "operation");
        assertEquals(right.operation.type, "OPERATION_MUL");

        // Sub-operandos da Multiplicação
        const mulOp1 = right.operation.operands[0]; // 50
        const mulOp2 = right.operation.operands[1]; // 2

        assertEquals(mulOp1.literal.value.n, "50");
        const origem = mulOp1.metadata.origem.stringVal || mulOp1.metadata.origem.string_val;
        assertEquals(origem, "extra");
        assertEquals(mulOp2.literal.value.n, "2");
    });
});
