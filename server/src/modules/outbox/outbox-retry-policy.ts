export const MAX_OUTBOX_RETRY_DELAY_MS = 60 * 60 * 1000

export function getOutboxRetryDelayMs(attempts: number) {
    if (!Number.isSafeInteger(attempts) || attempts < 0) {
        throw new Error('Outbox retry attempts are invalid.')
    }

    return Math.min(2 ** attempts * 60_000, MAX_OUTBOX_RETRY_DELAY_MS)
}
