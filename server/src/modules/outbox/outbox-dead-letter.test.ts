import { describe, expect, it } from 'vitest'

import { getOutboxFailureDisposition } from './outbox-dead-letter.js'

describe('outbox dead letter policy', () => {
    it('retries below the attempt limit and dead-letters at the limit', () => {
        expect(getOutboxFailureDisposition(1, 5)).toBe('retry')
        expect(getOutboxFailureDisposition(5, 5)).toBe('dead_letter')
        expect(getOutboxFailureDisposition(6, 5)).toBe('dead_letter')
    })

    it('rejects invalid policy values', () => {
        expect(() => getOutboxFailureDisposition(-1, 5)).toThrow()
        expect(() => getOutboxFailureDisposition(1, 0)).toThrow()
    })
})
