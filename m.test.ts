import { CalcAUY } from "./mod.ts";
import { configure, getConsoleSink, type LogRecord } from "@logtape";

await configure({
    sinks: {
        console: getConsoleSink({
            formatter(r: LogRecord): unknown[] {
                return [r.properties];
            },
        }),
    },
    loggers: [
        {
            category: "calc-auy",
            lowestLevel: "debug",
            sinks: ["console"],
        },
    ],
});

const calc = CalcAUY.from(2).add(5).mult(3).pow(CalcAUY.from(2).pow(2).pow("3/7"));

const tree = calc.hibernate();

const reanimate = CalcAUY.hydrate(tree).commit({ roundStrategy: "HALF_UP" });

console.log("String => ", reanimate.toStringNumber());
console.log("Verbal => ", reanimate.toVerbalA11y());
console.log("LaTeX => ", reanimate.toLaTeX());

console.log("===============================================");

const calc2 = CalcAUY.parseExpression("2 + 5 * 3 ^2^2^(3/7) ").commit({ roundStrategy: "HALF_UP" });
console.log("String => ", calc2.toStringNumber());
console.log("Verbal => ", calc2.toVerbalA11y());
console.log("LaTeX => ", calc2.toLaTeX());
