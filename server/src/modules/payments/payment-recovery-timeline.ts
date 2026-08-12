export type PaymentRecoveryAttempt = {
    attemptNumber: number
    status: string
    createdAt: Date
}

export function getPaymentRecoveryTimeline(attempts: PaymentRecoveryAttempt[]) {
    return [...attempts]
        .sort((left, right) => left.attemptNumber - right.attemptNumber)
        .map((attempt) => ({
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            createdAt: attempt.createdAt.toISOString(),
        }))
}
