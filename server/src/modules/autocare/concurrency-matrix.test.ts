import { describe, expect, it } from 'vitest'

import { AUTOCARE_CONCURRENCY_MATRIX, buildAutoCareTransitionMatrixReport, normalizeConcurrencyWorkerCount, redactConcurrencyIncident, simulateAutoCareConcurrentTransition, validateConcurrencyMatrix } from './concurrency-matrix.js'

describe('AutoCare concurrency matrix', () => {
    it('covers booking, quote, reschedule, cancellation and no-show actors', () => {
        expect(new Set(AUTOCARE_CONCURRENCY_MATRIX.map((scenario) => scenario.operation))).toEqual(new Set(['booking', 'quote', 'reschedule', 'cancellation', 'no_show']))
        expect(validateConcurrencyMatrix()).toBe(true)
    })

    it('requires one committed winner for every shared-state race', () => {
        for (const scenario of AUTOCARE_CONCURRENCY_MATRIX) {
            expect(scenario.expectedCommitted).toBe(1)
            expect(scenario.retryIsIdempotent).toBeTypeOf('boolean')
        }
    })

    it('produces a deterministic report for every terminal transition family', () => {
        const report = buildAutoCareTransitionMatrixReport({ workerCount: 99, durationsMs: [4, 2, 8, 1, 6, 3] })
        expect(report.operations).toEqual(['reschedule', 'cancellation', 'no_show', 'booking', 'quote'])
        expect(report.workerCount).toBe(AUTOCARE_CONCURRENCY_MATRIX.length)
        expect(report.p95Ms).toBe(8)
        expect(report.p99Ms).toBe(8)
        expect(report.expectedCommitted).toBe(AUTOCARE_CONCURRENCY_MATRIX.length)
        expect(report.auditEvents).toHaveLength(AUTOCARE_CONCURRENCY_MATRIX.length)
    })

    it('models controlled conflicts and idempotent terminal retries', () => {
        const bookingRace = simulateAutoCareConcurrentTransition(AUTOCARE_CONCURRENCY_MATRIX.find((scenario) => scenario.id === 'instant-booking-same-resource')!)
        expect(bookingRace).toMatchObject({ committed: 1, conflicts: 1, capacityConflictStatus: 409 })
        const cancellationRetry = simulateAutoCareConcurrentTransition(AUTOCARE_CONCURRENCY_MATRIX.find((scenario) => scenario.id === 'cancel-client-retry')!)
        expect(cancellationRetry).toMatchObject({ committed: 1, conflicts: 0, idempotentRetries: 1 })
    })

    it('bounds synthetic worker count and rejects invalid values', () => {
        expect(normalizeConcurrencyWorkerCount(99, 4)).toBe(4)
        expect(normalizeConcurrencyWorkerCount(4, 99)).toBe(4)
        expect(() => normalizeConcurrencyWorkerCount(0)).toThrow()
    })

    it('redacts PII from worker/outbox incident fixtures', () => {
        const incident = redactConcurrencyIncident({ operation: 'booking', status: 'dead_letter', message: 'client@example.com +79990000000 1HGCM82633A004352', requestId: 'opaque-request' })
        expect(incident.message).toBe('[EMAIL] [PHONE] [VIN]')
        expect(incident).toMatchObject({ operation: 'booking', status: 'dead_letter', requestIdPresent: true })
    })
})
