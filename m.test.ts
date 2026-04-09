import { CalcAUY } from "./mod.ts";
// import { configure, getConsoleSink, type LogRecord } from "@logtape";

// await configure({
//     sinks: {
//         console: getConsoleSink({
//             formatter(r: LogRecord): unknown[] {
//                 return [r.properties];
//             },
//         }),
//     },
//     loggers: [
//         {
//             category: "calc-auy",
//             lowestLevel: "debug",
//             sinks: ["console"],
//         },
//     ],
// });

const calc = CalcAUY.from(100).pow("3/7").commit();

console.log("String => ", calc.toStringNumber());
console.log("MOnetary => ", calc.toVerbalA11y({ locale: "de-DE" }));
console.log("MOnetary => ", calc.toVerbalA11y({ locale: "en-EU" }));
console.log("MOnetary => ", calc.toVerbalA11y({ locale: "fr-FR" }));
console.log("MOnetary => ", calc.toVerbalA11y({ locale: "ja-JP" }));
console.log("MOnetary => ", calc.toVerbalA11y({ locale: "pt-BR" }));
console.log("MOnetary => ", calc.toVerbalA11y({ locale: "zh-CN" }));
console.log("===============================================");
