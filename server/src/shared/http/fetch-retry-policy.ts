export const MAX_FETCH_TIMEOUT_MS = 120_000
export const MAX_FETCH_RETRIES = 8
export const MAX_FETCH_RETRY_DELAY_MS = 10_000

export function assertFetchWithRetryOptions(input: {
    timeoutMs: number
    maxRetries: number
    retryDelayMs?: number
}) {
    const retryDelayMs = input.retryDelayMs ?? 250
    if (
        !Number.isSafeInteger(input.timeoutMs)
        || input.timeoutMs < 1
        || input.timeoutMs > MAX_FETCH_TIMEOUT_MS
        || !Number.isSafeInteger(input.maxRetries)
        || input.maxRetries < 0
        || input.maxRetries > MAX_FETCH_RETRIES
        || !Number.isSafeInteger(retryDelayMs)
        || retryDelayMs < 0
        || retryDelayMs > MAX_FETCH_RETRY_DELAY_MS
    ) {
        throw new Error('Fetch retry options are invalid.')
    }

    return { ...input, retryDelayMs }
}
