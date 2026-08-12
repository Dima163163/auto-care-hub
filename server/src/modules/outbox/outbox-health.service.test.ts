import { describe, expect, it } from 'vitest'

import { getOutboxHealthSummary } from './outbox-health.service.js'

describe('getOutboxHealthSummary', () => {
    it('calculates age from the oldest event', () => {
        expect(getOutboxHealthSummary({
            pending: 4,
            deadLetter: 1,
            oldestCreatedAt: '2026-01-01T00:00:00.000Z',
        }, Date.parse('2026-01-01T00:00:12.500Z'))).toEqual({
            pending: 4,
            deadLetter: 1,
            oldestAgeMs: 12_500,
        })
    })

    it('does not return a negative age for future-dated input', () => {
        expect(getOutboxHealthSummary({ pending: 0, deadLetter: 0, oldestCreatedAt: '2026-01-01T00:00:10.000Z' }, Date.parse('2026-01-01T00:00:00.000Z')).oldestAgeMs).toBe(0)
    })

    it('keeps age unavailable when there is no active event', () => {
        expect(getOutboxHealthSummary({ pending: 0, deadLetter: 0, oldestCreatedAt: null }).oldestAgeMs).toBeNull()
    })
})
