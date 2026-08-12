export const MAX_OUTBOX_DELAY_MS = 7 * 24 * 60 * 60 * 1_000
export const MAX_OUTBOX_PAST_MS = 5 * 60 * 1_000

export function assertOutboxAvailableAt(availableAt: Date | undefined, now = Date.now()) {
    if (availableAt === undefined) return new Date(now)

    const timestamp = availableAt.getTime()
    if (
        !Number.isFinite(timestamp)
        || timestamp < now - MAX_OUTBOX_PAST_MS
        || timestamp > now + MAX_OUTBOX_DELAY_MS
    ) {
        throw new Error('Outbox availability time is outside accepted bounds.')
    }

    return new Date(timestamp)
}
