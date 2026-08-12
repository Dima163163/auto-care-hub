export const DEFAULT_RECONCILIATION_BATCH_SIZE = 20
export const MAX_RECONCILIATION_BATCH_SIZE = 100

export function getReconciliationBatchLimit(limit = DEFAULT_RECONCILIATION_BATCH_SIZE) {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECONCILIATION_BATCH_SIZE) {
        throw new Error('Reconciliation batch size is invalid.')
    }
    return limit
}

export function assertReconciliationResult(result: Record<string, number>) {
    if (Object.values(result).some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Payment reconciliation result is invalid.')
    }

    return result
}

export function selectReconciliationCandidates<T>(rows: T[], limit = DEFAULT_RECONCILIATION_BATCH_SIZE) {
    return rows.slice(0, getReconciliationBatchLimit(limit))
}

export type ReconciliationGapCandidate = {
    paymentStatus: string
    stripeSessionId: string | null
    bookingStatus: string
    notificationPresent: boolean
}

export function selectReconciliationGaps<T>(
    rows: T[],
    getCandidate: (row: T) => ReconciliationGapCandidate,
    limit = DEFAULT_RECONCILIATION_BATCH_SIZE,
) {
    const gaps = rows.filter((row) => {
        const candidate = getCandidate(row)
        return (
            ['pending', 'failed'].includes(candidate.paymentStatus) && Boolean(candidate.stripeSessionId)
        ) || (
            candidate.paymentStatus === 'paid'
            && (candidate.bookingStatus === 'pending' || !candidate.notificationPresent)
        )
    })

    return selectReconciliationCandidates(gaps, limit)
}
