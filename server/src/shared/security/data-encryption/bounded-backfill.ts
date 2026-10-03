export type BackfillRow<T> = { id: string; value: T }
export type BackfillCheckpoint = { afterId: string | null; processed: number }
export type BackfillAdapter<T, U> = {
    readBatch: (afterId: string | null, limit: number) => Promise<BackfillRow<T>[]>
    transform: (row: BackfillRow<T>) => Promise<U>
    // The adapter must atomically compare source versions, apply the whole
    // batch and persist this checkpoint. A conflict rejects the batch.
    commitBatch: (rows: Array<{ source: BackfillRow<T>; value: U }>, checkpoint: BackfillCheckpoint) => Promise<void>
}
export async function runBoundedBackfill<T, U>(adapter: BackfillAdapter<T, U>, options: {
    checkpoint: BackfillCheckpoint; batchSize: number; maxBatches: number
}) {
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
    if ((options.checkpoint.afterId !== null && !uuid.test(options.checkpoint.afterId))
        || !Number.isSafeInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 500
        || !Number.isSafeInteger(options.maxBatches) || options.maxBatches < 1 || options.maxBatches > 10000
        || !Number.isSafeInteger(options.checkpoint.processed) || options.checkpoint.processed < 0) throw new Error('Invalid backfill budget or checkpoint.')
    let checkpoint = { ...options.checkpoint }
    for (let batch = 0; batch < options.maxBatches; batch += 1) {
        const rows = await adapter.readBatch(checkpoint.afterId, options.batchSize)
        if (rows.length > options.batchSize) throw new Error('Backfill adapter exceeded the batch budget.')
        if (!rows.length) return { checkpoint, exhausted: true }
        let previous = checkpoint.afterId
        for (const row of rows) {
            if (!uuid.test(row.id) || (previous !== null && row.id <= previous)) throw new Error('Backfill adapter returned an invalid keyset order.')
            previous = row.id
        }
        const transformed: Array<{ source: BackfillRow<T>; value: U }> = []
        for (const source of rows) transformed.push({ source, value: await adapter.transform(source) })
        if (!Number.isSafeInteger(checkpoint.processed + rows.length)) throw new Error('Backfill progress exceeded its supported range.')
        const next = { afterId: previous, processed: checkpoint.processed + rows.length }
        await adapter.commitBatch(transformed, next)
        checkpoint = next
        if (rows.length < options.batchSize) return { checkpoint, exhausted: true }
    }
    return { checkpoint, exhausted: false }
}
