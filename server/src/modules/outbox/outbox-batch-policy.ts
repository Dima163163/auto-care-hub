export const DEFAULT_OUTBOX_BATCH_SIZE = 20
export const MAX_OUTBOX_BATCH_SIZE = 100

export function getOutboxBatchSize(size = DEFAULT_OUTBOX_BATCH_SIZE) {
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_OUTBOX_BATCH_SIZE) {
        throw new Error('Outbox batch size is invalid.')
    }

    return size
}
