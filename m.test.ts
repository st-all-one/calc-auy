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

const reanimate = CalcAUY.hydrate(tree).commit({ roundStrategy: "NBR5891" });

console.log("String => ", reanimate.toStringNumber());
console.log("Verbal => ", reanimate.toVerbalA11y());
console.log("LaTeX => ", reanimate.toLaTeX());
console.log("JSON => ", reanimate.toJSON());
console.log("===============================================");
