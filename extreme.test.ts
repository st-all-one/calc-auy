import { CalcAUY } from "./mod.ts";

const t = performance.now();

const calc = CalcAUY.from("1234567.89")
    .pow("353/1141")
    .add(
        CalcAUY.from(0.00123).div(
            CalcAUY.from(7)
                .div(11),
        )
            .pow(9),
    )
    .mult(
        CalcAUY.from(3)
            .div(
                CalcAUY.from(7)
                    .div(13),
            )
            .pow("999/135"),
    ).div(
        CalcAUY.from(0.0123).div(
            CalcAUY.from(0.007).pow("81/46"),
        ),
    ).pow("49/189")
    .commit({ roundStrategy: "NBR5891" });

console.log(performance.now() - t);

console.log(calc.toFloatNumber());
console.log(calc.toLaTeX());
console.log(calc.toMonetary());

console.log(calc.toAuditTrace());
