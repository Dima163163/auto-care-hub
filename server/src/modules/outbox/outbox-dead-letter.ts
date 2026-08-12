export type OutboxFailureDisposition = 'retry' | 'dead_letter'

export function getOutboxFailureDisposition(attempts: number, maxAttempts: number): OutboxFailureDisposition {
    if (!Number.isSafeInteger(attempts) || !Number.isSafeInteger(maxAttempts) || attempts < 0 || maxAttempts < 1) {
        throw new Error('Outbox attempt policy values are invalid.')
    }

    return attempts >= maxAttempts ? 'dead_letter' : 'retry'
}
