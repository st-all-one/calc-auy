/**
 * CalcAUY Demo - Security and Rate Limiting
 * @module
 */

const RATE_LIMIT_WINDOW = 30000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 10;
const requestLog = new Map<string, number[]>();

/**
 * Checks if a specific IP/client is exceeding the allowed request rate.
 */
export function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = requestLog.get(ip) ?? [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
    recent.push(now);
    requestLog.set(ip, recent);
    return recent.length > MAX_REQUESTS_PER_WINDOW;
}
