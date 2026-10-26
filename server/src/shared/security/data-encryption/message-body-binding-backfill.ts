import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { messageBodyRecordContext, type MessageBodyRecordScope } from './message-body-record-scope.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type MessageBodyRow = MessageBodyRecordScope & { body: string | null; bodyBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_messages'

function transformRow(row: BackfillRow<MessageBodyRow>, requireBinding: boolean): string | null {
    const context = messageBodyRecordContext(row.value)
    if (row.value.body === null) {
        if (row.value.bodyBinding !== null) throw new Error('Encrypted autocare_service_messages.body record binding is invalid.')
        return null
    }
    const body = decryptFieldValue<string>('autocare_service_messages', 'body', row.value.body)
    if (typeof body !== 'string') throw new Error('Encrypted autocare_service_messages.body is invalid.')
    verifyPlaintextRecordBinding('autocare_service_messages', 'body', body, row.id, row.value.bodyBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.bodyBinding ?? createPlaintextRecordBinding('autocare_service_messages', 'body', body, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<MessageBodyRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "body", "bodyBinding", "requestId", "threadId", "senderId" FROM "autocare_service_messages" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & MessageBodyRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Message body binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Message body binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetMessageBodyBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "message_body_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runMessageBodyBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "message_body_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "message_body_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "message_body_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Message body binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.bodyBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_messages" SET "bodyBinding" = $1 WHERE "id" = $2::uuid AND "body" IS NOT DISTINCT FROM $3 AND "bodyBinding" IS NOT DISTINCT FROM $4 AND "requestId" IS NOT DISTINCT FROM $5::uuid AND "threadId" IS NOT DISTINCT FROM $6::uuid AND "senderId" = $7::uuid RETURNING "id"',
                        [value, row.id, row.value.body, row.value.bodyBinding, row.value.requestId, row.value.threadId, row.value.senderId],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Message body binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "message_body_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyMessageBodyBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
