import { getLogger } from "@logtape";
import { LOG_NAMESPACE } from "./constants.ts";

/**
 * Pre-configured logger for the library using LogTape 2.0.
 */
export const logger = getLogger(LOG_NAMESPACE);

/**
 * Creates a sub-logger for specific namespaces.
 */
export function getSubLogger(subName: string) {
    return getLogger([...LOG_NAMESPACE, subName]);
}
