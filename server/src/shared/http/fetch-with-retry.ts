const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
import { assertFetchWithRetryOptions } from './fetch-retry-policy.js'

const DEFAULT_RETRY_DELAY_MS = 250
const MAX_RETRY_DELAY_MS = 1_000

export type FetchWithRetryOptions = {
    timeoutMs: number
    maxRetries: number
    retryDelayMs?: number
}

function wait(delayMs: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs)
    })
}

function getRetryDelayMs(retryIndex: number, baseDelayMs: number) {
    return Math.min(baseDelayMs * 2 ** retryIndex, MAX_RETRY_DELAY_MS)
}

export async function fetchWithRetry(
    input: string | URL,
    init: RequestInit,
    options: FetchWithRetryOptions,
) {
    const normalizedOptions = assertFetchWithRetryOptions(options)
    let lastError: unknown

    for (let retryIndex = 0; retryIndex <= normalizedOptions.maxRetries; retryIndex += 1) {
        const controller = new AbortController()
        const timeoutHandle = setTimeout(() => controller.abort(), normalizedOptions.timeoutMs)

        try {
            const response = await fetch(input, {
                ...init,
                signal: controller.signal,
            })

            if (
                !RETRYABLE_STATUS_CODES.has(response.status)
                || retryIndex === normalizedOptions.maxRetries
            ) {
                return response
            }

            await response.body?.cancel()
        } catch (error) {
            lastError = error

            if (retryIndex === normalizedOptions.maxRetries) {
                throw error
            }
        } finally {
            clearTimeout(timeoutHandle)
        }

        await wait(getRetryDelayMs(
            retryIndex,
            normalizedOptions.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
        ))
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('External request failed after bounded retries.')
}
