import { describe, expect, it } from 'vitest'

import { evaluatePilotReliability } from './pilot-reliability-policy.js'

describe('pilot reliability policy', () => {
    it('passes measured response and booking SLOs', () => {
        const checks = evaluatePilotReliability({
            responseSamples: 8,
            averageResponseMinutes: 10,
            p95ResponseMinutes: 24,
            confirmedBookings: 10,
            confirmationSamples: 10,
            confirmationReliabilityPercent: 100,
            bookingConflicts: 0,
        }, {
            minResponseSamples: 5,
            maxP95ResponseMinutes: 30,
            minConfirmationSamples: 5,
            minConfirmationReliabilityPercent: 95,
        })
        expect(checks.every((check) => check.status === 'pass')).toBe(true)
    })

    it('blocks empty or slow pilot evidence', () => {
        const checks = evaluatePilotReliability({
            responseSamples: 0,
            averageResponseMinutes: null,
            p95ResponseMinutes: null,
            confirmedBookings: 0,
            confirmationSamples: 2,
            confirmationReliabilityPercent: 50,
            bookingConflicts: 1,
        }, {
            minResponseSamples: 5,
            maxP95ResponseMinutes: 30,
            minConfirmationSamples: 5,
            minConfirmationReliabilityPercent: 95,
        })
        expect(checks.filter((check) => check.status === 'blocked').map((check) => check.name)).toEqual([
            'Provider response samples',
            'Provider response p95',
            'Booking confirmation samples',
            'Booking confirmation reliability',
        ])
    })
})
