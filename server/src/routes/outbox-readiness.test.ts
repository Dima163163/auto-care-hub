import { describe, expect, it } from 'vitest'

import { evaluateOutboxReadiness } from './outbox-readiness.js'

const thresholds = {
    maxPending: 100,
    maxDeadLetter: 0,
    maxOldestAgeMs: 15_000,
}

describe('evaluateOutboxReadiness', () => {
    it('accepts values at configured thresholds', () => {
        expect(evaluateOutboxReadiness({ pending: 100, deadLetter: 0, oldestAgeMs: 15_000 }, thresholds)).toEqual({
            ok: true,
            reasons: [],
        })
    })

    it('reports every exceeded threshold', () => {
        expect(evaluateOutboxReadiness({ pending: 101, deadLetter: 1, oldestAgeMs: 15_001 }, thresholds)).toEqual({
            ok: false,
            reasons: [
                'pending_threshold_exceeded',
                'dead_letter_threshold_exceeded',
                'oldest_age_threshold_exceeded',
            ],
        })
    })

    it('ignores unavailable measurements', () => {
        expect(evaluateOutboxReadiness({ pending: null, deadLetter: null, oldestAgeMs: null }, thresholds)).toEqual({
            ok: true,
            reasons: [],
        })
    })
})
