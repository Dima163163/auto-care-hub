export type OutboxReadinessProbe = {
    pending: number | null
    deadLetter: number | null
    oldestAgeMs: number | null
}

export type OutboxReadinessThresholds = {
    maxPending: number
    maxDeadLetter: number
    maxOldestAgeMs: number
}

export type OutboxReadinessReason =
    | 'pending_threshold_exceeded'
    | 'dead_letter_threshold_exceeded'
    | 'oldest_age_threshold_exceeded'

export type OutboxReadinessResult = {
    ok: boolean
    reasons: OutboxReadinessReason[]
}

export function evaluateOutboxReadiness(
    probe: OutboxReadinessProbe,
    thresholds: OutboxReadinessThresholds,
): OutboxReadinessResult {
    const reasons: OutboxReadinessReason[] = []

    if (probe.pending !== null && probe.pending > thresholds.maxPending) {
        reasons.push('pending_threshold_exceeded')
    }

    if (probe.deadLetter !== null && probe.deadLetter > thresholds.maxDeadLetter) {
        reasons.push('dead_letter_threshold_exceeded')
    }

    if (probe.oldestAgeMs !== null && probe.oldestAgeMs > thresholds.maxOldestAgeMs) {
        reasons.push('oldest_age_threshold_exceeded')
    }

    return {
        ok: reasons.length === 0,
        reasons,
    }
}
