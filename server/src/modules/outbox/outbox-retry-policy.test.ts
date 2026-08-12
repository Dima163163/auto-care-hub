import { describe, expect, it } from 'vitest'

import { getOutboxRetryDelayMs } from './outbox-retry-policy.js'

describe('outbox retry backoff policy', () => {
    it('uses exponential backoff with a one-hour ceiling', () => {
        expect(getOutboxRetryDelayMs(0)).toBe(60_000)
        expect(getOutboxRetryDelayMs(3)).toBe(480_000)
        expect(getOutboxRetryDelayMs(20)).toBe(3_600_000)
    })

    it('rejects malformed attempt counts', () => {
        expect(() => getOutboxRetryDelayMs(-1)).toThrow(/invalid/)
        expect(() => getOutboxRetryDelayMs(1.5)).toThrow(/invalid/)
    })
})
