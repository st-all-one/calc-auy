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

const calc = CalcAUY.from(100).pow("3/7")
    .setMetadata("stall", "teste")
    .add(3).setMetadata("teste", 2).setLoggingPolicy({ sensitive: false })
    .commit();

console.log("String => ", calc.toAuditTrace());
