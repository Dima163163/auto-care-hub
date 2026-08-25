export type AutoCareConcurrencyOperation = 'reschedule' | 'cancellation' | 'no_show' | 'booking'

export type AutoCareConcurrencyScenario = {
    id: string
    operation: AutoCareConcurrencyOperation
    actors: string[]
    expectedCommitted: number
    expectedConflicts: number
    retryIsIdempotent: boolean
    requiresDatabaseLock: boolean
}

/**
 * Release-test contract for operations that mutate one request or one slot.
 * Integration suites use these rows to keep the matrix from shrinking when a
 * transition is refactored; the pure policy is also useful without Docker.
 */
export const AUTOCARE_CONCURRENCY_MATRIX: readonly AutoCareConcurrencyScenario[] = [
    { id: 'reschedule-two-client-decisions', operation: 'reschedule', actors: ['client-a', 'client-b'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: true, requiresDatabaseLock: true },
    { id: 'cancel-client-and-owner', operation: 'cancellation', actors: ['client', 'owner'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: true, requiresDatabaseLock: true },
    { id: 'no-show-two-owner-retries', operation: 'no_show', actors: ['owner', 'owner'], expectedCommitted: 1, expectedConflicts: 0, retryIsIdempotent: true, requiresDatabaseLock: true },
    { id: 'instant-booking-same-resource', operation: 'booking', actors: ['client-a', 'client-b'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: false, requiresDatabaseLock: true },
    { id: 'multi-actor-request-confirmation', operation: 'booking', actors: ['owner-a', 'owner-b'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: true, requiresDatabaseLock: true },
]

export function validateConcurrencyMatrix(matrix: readonly AutoCareConcurrencyScenario[] = AUTOCARE_CONCURRENCY_MATRIX) {
    return matrix.every((scenario) => scenario.expectedCommitted >= 1
        && scenario.expectedConflicts >= 0
        && scenario.actors.length >= 2
        && scenario.requiresDatabaseLock)
}
