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

const PII_POLICY = false;

const calc = CalcAUY.setLoggingPolicy({ sensitive: PII_POLICY })
    .from(100)
    .commit();

console.log("String => ", calc.toMonetary({ locale: "pt-BR", currency: "USD" }));
