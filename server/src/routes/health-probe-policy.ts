export const MAX_HEALTH_PROBE_TIMEOUT_MS = 120_000

export function assertHealthProbeTimeout(timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_HEALTH_PROBE_TIMEOUT_MS) {
        throw new Error('Health probe timeout is invalid.')
    }

    return timeoutMs
}
