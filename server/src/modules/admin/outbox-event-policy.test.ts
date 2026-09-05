import { describe, expect, it } from 'vitest'

import { normalizeOutboxEventUuid } from './outbox-event-policy.js'

describe('outbox event input policy', () => {
    it('normalizes UUIDs before event lookup', () => {
        expect(normalizeOutboxEventUuid(' 00000000-0000-4000-8000-000000000001 ')).toBe('00000000-0000-4000-8000-000000000001')
    })

    it('rejects malformed, non-string and unsupported identifiers', () => {
        expect(normalizeOutboxEventUuid('event-1')).toBeNull()
        expect(normalizeOutboxEventUuid(null)).toBeNull()
        expect(normalizeOutboxEventUuid(['00000000-0000-4000-8000-000000000001'])).toBeNull()
    })
})
