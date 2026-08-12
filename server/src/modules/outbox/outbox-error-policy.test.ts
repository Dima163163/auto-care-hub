import { describe, expect, it } from 'vitest'

import { normalizeOutboxErrorMessage } from './outbox-error-policy.js'

describe('outbox error policy', () => {
    it('removes controls and bounds worker error text', () => {
        expect(normalizeOutboxErrorMessage(' provider\n failure ')).toBe('provider failure')
        expect(normalizeOutboxErrorMessage('x'.repeat(1_001))).toHaveLength(1_000)
    })

    it('uses a stable fallback for empty messages', () => {
        expect(normalizeOutboxErrorMessage(' \n ')).toBe('Unknown outbox error')
    })
})
