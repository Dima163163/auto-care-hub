import { describe, expect, it } from 'vitest'

import { AUTOCARE_CONCURRENCY_MATRIX, validateConcurrencyMatrix } from './concurrency-matrix.js'

describe('AutoCare concurrency matrix', () => {
    it('covers booking, reschedule, cancellation and no-show actors', () => {
        expect(new Set(AUTOCARE_CONCURRENCY_MATRIX.map((scenario) => scenario.operation))).toEqual(new Set(['booking', 'reschedule', 'cancellation', 'no_show']))
        expect(validateConcurrencyMatrix()).toBe(true)
    })

    it('requires one committed winner for every shared-state race', () => {
        for (const scenario of AUTOCARE_CONCURRENCY_MATRIX) {
            expect(scenario.expectedCommitted).toBe(1)
            expect(scenario.retryIsIdempotent).toBeTypeOf('boolean')
        }
    })
})
