export type OutboxLeaseDecision = 'claim' | 'skip' | 'recover_stale'

export function getStaleOutboxRecoveryStatus(attempts: number, maxAttempts: number) {
    if (!Number.isSafeInteger(attempts) || !Number.isSafeInteger(maxAttempts) || attempts < 0 || maxAttempts < 1) {
        throw new Error('Outbox recovery attempt values are invalid.')
    }
    return attempts >= maxAttempts ? 'dead_letter' as const : 'failed' as const
}

export function getOutboxLeaseDecision(input: {
    status: 'pending' | 'failed' | 'processing' | 'completed' | 'dead_letter'
    availableAt: number
    lockedAt: number | null
    attempts: number
    maxAttempts: number
    now: number
    staleLockMs: number
}) : OutboxLeaseDecision {
    if (input.attempts >= input.maxAttempts || input.availableAt > input.now) return 'skip'
    if (input.status === 'processing') {
        return input.lockedAt !== null && input.lockedAt <= input.now - input.staleLockMs
            ? 'recover_stale'
            : 'skip'
    }
    return input.status === 'pending' || input.status === 'failed' ? 'claim' : 'skip'
}
