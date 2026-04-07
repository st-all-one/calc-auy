import { getLogger, type Logger } from "@logtape";
import { LOG_NAMESPACE } from "../core/constants.ts";

/**
 * Pre-configured logger for the library using LogTape 2.0.
 */
export const logger: Logger = getLogger(LOG_NAMESPACE);

/**
 * Creates a sub-logger for specific namespaces.
 */
export function getSubLogger(subName: string): Logger {
    return getLogger([...LOG_NAMESPACE, subName]);
}

/**
 * Utility to measure execution time of a function using the Temporal API.
 * Returns a tuple [result, durationInMsString].
 */
export function measureTime<T>(fn: () => T): [T, string] {
    // @ts-ignore: Temporal is native in modern Deno but might lack types in some environments
    const start = Temporal.Now.instant();
    const result = fn();
    // @ts-ignore: Temporal is native in modern Deno but might lack types in some environments
    const end = Temporal.Now.instant();
    const duration = end.since(start);
    // @ts-ignore: Duration is calculated using Temporal's native API
    return [result, `${duration.total({ unit: "milliseconds" }).toFixed(4)}ms`];
}
