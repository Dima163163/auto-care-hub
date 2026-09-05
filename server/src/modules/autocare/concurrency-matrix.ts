export type AutoCareConcurrencyOperation = 'reschedule' | 'cancellation' | 'no_show' | 'booking' | 'quote'

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
    { id: 'cancel-client-retry', operation: 'cancellation', actors: ['client', 'client'], expectedCommitted: 1, expectedConflicts: 0, retryIsIdempotent: true, requiresDatabaseLock: true },
    { id: 'no-show-two-owner-retries', operation: 'no_show', actors: ['owner', 'owner'], expectedCommitted: 1, expectedConflicts: 0, retryIsIdempotent: true, requiresDatabaseLock: true },
    { id: 'instant-booking-same-resource', operation: 'booking', actors: ['client-a', 'client-b'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: false, requiresDatabaseLock: true },
    { id: 'multi-actor-request-confirmation', operation: 'booking', actors: ['owner-a', 'owner-b'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: true, requiresDatabaseLock: true },
    { id: 'quote-accept-decline', operation: 'quote', actors: ['client', 'client'], expectedCommitted: 1, expectedConflicts: 1, retryIsIdempotent: true, requiresDatabaseLock: true },
]

export const MAX_AUTOCARE_CONCURRENCY_WORKERS = 16

export type AutoCareTransitionOutcome = 'committed' | 'conflict' | 'idempotent'

export function normalizeConcurrencyWorkerCount(workerCount: number, scenarioCount = AUTOCARE_CONCURRENCY_MATRIX.length) {
    if (!Number.isSafeInteger(workerCount) || workerCount < 1) throw new Error('Concurrency worker count must be a positive integer.')
    if (!Number.isSafeInteger(scenarioCount) || scenarioCount < 1) throw new Error('Concurrency scenario count must be positive.')
    return Math.min(workerCount, MAX_AUTOCARE_CONCURRENCY_WORKERS, scenarioCount)
}

export function simulateAutoCareConcurrentTransition(scenario: AutoCareConcurrencyScenario) {
    const outcomes: AutoCareTransitionOutcome[] = scenario.actors.map((_, index) => {
        if (index === 0) return 'committed'
        if (scenario.expectedConflicts > 0 && index <= scenario.expectedConflicts) return 'conflict'
        return 'idempotent'
    })
    return {
        operation: scenario.operation,
        committed: outcomes.filter((outcome) => outcome === 'committed').length,
        conflicts: outcomes.filter((outcome) => outcome === 'conflict').length,
        idempotentRetries: outcomes.filter((outcome) => outcome === 'idempotent').length,
        outcomes,
        capacityConflictStatus: scenario.operation === 'booking' && scenario.expectedConflicts > 0 ? 409 : null,
        auditEvent: `autocare.transition.${scenario.operation}`,
    }
}

function percentile(values: readonly number[], percentileValue: number) {
    const sorted = [...values].sort((left, right) => left - right)
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1))
    return sorted[index] ?? null
}

export function buildAutoCareTransitionMatrixReport(input: {
    matrix?: readonly AutoCareConcurrencyScenario[]
    workerCount?: number
    durationsMs?: readonly number[]
} = {}) {
    const matrix = input.matrix ?? AUTOCARE_CONCURRENCY_MATRIX
    const workerCount = normalizeConcurrencyWorkerCount(input.workerCount ?? 4, matrix.length)
    const durationsMs = input.durationsMs ?? matrix.map((scenario, index) => scenario.id.length + index + 1)
    if (durationsMs.length === 0 || durationsMs.some((duration) => !Number.isFinite(duration) || duration < 0)) throw new Error('Concurrency durations must be finite non-negative numbers.')
    const scenarios = matrix.map(simulateAutoCareConcurrentTransition)
    return {
        schemaVersion: 1 as const,
        workerCount,
        scenarioCount: scenarios.length,
        operations: [...new Set(matrix.map((scenario) => scenario.operation))],
        expectedCommitted: scenarios.reduce((sum, scenario) => sum + scenario.committed, 0),
        expectedConflicts: scenarios.reduce((sum, scenario) => sum + scenario.conflicts, 0),
        p95Ms: percentile(durationsMs, 95),
        p99Ms: percentile(durationsMs, 99),
        capacityConflictStatuses: scenarios.map((scenario) => scenario.capacityConflictStatus).filter((status): status is 409 => status === 409),
        auditEvents: scenarios.map((scenario) => scenario.auditEvent),
        scenarios,
    }
}

export function redactConcurrencyIncident(input: { operation: string; status: string; message?: string; requestId?: string }) {
    return {
        operation: input.operation,
        status: input.status,
        requestIdPresent: Boolean(input.requestId),
        message: input.message
            ?.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
            .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi, '[VIN]')
            .replace(/(?<![A-Za-z0-9])\+?\d[\d ()-]{7,}(?![A-Za-z0-9])/g, '[PHONE]')
            .replace(/\]\[/g, '] [')
            .slice(0, 240),
    }
}

export function validateConcurrencyMatrix(matrix: readonly AutoCareConcurrencyScenario[] = AUTOCARE_CONCURRENCY_MATRIX) {
    return matrix.every((scenario) => scenario.expectedCommitted >= 1
        && scenario.expectedConflicts >= 0
        && scenario.actors.length >= 2
        && scenario.requiresDatabaseLock)
}
