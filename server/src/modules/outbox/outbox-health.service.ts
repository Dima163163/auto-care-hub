export type OutboxHealthSummaryInput = {
    pending: number
    deadLetter: number
    oldestCreatedAt: Date | string | null | undefined
}

export type OutboxHealthSummary = {
    pending: number
    deadLetter: number
    oldestAgeMs: number | null
}

export function getOutboxHealthSummary(
    input: OutboxHealthSummaryInput,
    now = Date.now(),
): OutboxHealthSummary {
    const oldestCreatedAt = input.oldestCreatedAt
        ? new Date(input.oldestCreatedAt).getTime()
        : null

    return {
        pending: input.pending,
        deadLetter: input.deadLetter,
        oldestAgeMs: oldestCreatedAt === null
            ? null
            : Math.max(0, now - oldestCreatedAt),
    }
}
