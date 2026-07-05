import {CalcAUY} from "./mod.ts"

const calc = CalcAUY.create({contextLabel:"Teste"});
const result = await calc.from("1234567.89")
        .setMetadata("transaction_id", "ABC-123")
        .pow("353/1141")
        .add(
            calc.from(0.00123).div(
                calc.from(7)
                            .div(11)
            ).group()
            .pow(9)
        )
        .setMetadata("step", "final_audit")
        .mult(
            calc.from(3)
            .div(
                calc.from(7)
                           .div(13)
            )
            .pow("999/135")
        )
        .group().div(calc.from(0.0123).div(
                calc.from(0.007).pow("81/46")
            ).group()).pow("49/189")
      .commit();

console.log(result.toMermaidGraph());
