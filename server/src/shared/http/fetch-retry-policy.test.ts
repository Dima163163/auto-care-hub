import { describe, expect, it } from 'vitest'

import {
    assertFetchWithRetryOptions,
    MAX_FETCH_RETRIES,
    MAX_FETCH_TIMEOUT_MS,
} from './fetch-retry-policy.js'

describe('fetch retry policy', () => {
    it('accepts bounded network budgets', () => {
        expect(assertFetchWithRetryOptions({ timeoutMs: 5_000, maxRetries: 2 }))
            .toMatchObject({ timeoutMs: 5_000, maxRetries: 2, retryDelayMs: 250 })
    })

    it('rejects invalid timeout, retry, and delay values', () => {
        expect(() => assertFetchWithRetryOptions({ timeoutMs: 0, maxRetries: 0 })).toThrow(/invalid/)
        expect(() => assertFetchWithRetryOptions({ timeoutMs: MAX_FETCH_TIMEOUT_MS + 1, maxRetries: 0 })).toThrow(/invalid/)
        expect(() => assertFetchWithRetryOptions({ timeoutMs: 100, maxRetries: MAX_FETCH_RETRIES + 1 })).toThrow(/invalid/)
        expect(() => assertFetchWithRetryOptions({ timeoutMs: 100, maxRetries: 0, retryDelayMs: -1 })).toThrow(/invalid/)
    })
})
