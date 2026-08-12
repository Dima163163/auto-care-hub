export const MAX_API_LATENCY_MS = 60 * 60 * 1000

export function getBoundedApiLatencyMs(
    startedAt: number,
    finishedAt = Date.now(),
) {
    if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) {
        return 0
    }

    return Math.min(Math.max(finishedAt - startedAt, 0), MAX_API_LATENCY_MS)
}
