import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { messageRecordContext, type MessageRecordScope } from './message-record-scope.js'
import { serializeMessageOffer } from './message-offer-value.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type MessageOfferRow = MessageRecordScope & { offer: unknown | null; offerBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_messages'

function transformRow(row: BackfillRow<MessageOfferRow>, requireBinding: boolean): string | null {
    const context = messageRecordContext(row.value)
    if (row.value.offer === null) {
        if (row.value.offerBinding !== null) throw new Error('Encrypted autocare_service_messages.offer record binding is invalid.')
        return null
    }
    const offer = serializeMessageOffer(decryptFieldValue('autocare_service_messages', 'offer', row.value.offer))
    verifyPlaintextRecordBinding('autocare_service_messages', 'offer', offer, row.id, row.value.offerBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.offerBinding ?? createPlaintextRecordBinding('autocare_service_messages', 'offer', offer, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<MessageOfferRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "offer", "offerBinding", "requestId", "threadId", "senderId", "kind" FROM "autocare_service_messages" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & MessageOfferRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Message offer binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Message offer binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetMessageOfferBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "message_offer_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runMessageOfferBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "message_offer_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "message_offer_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "message_offer_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Message offer binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.offerBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_messages" SET "offerBinding" = $1 WHERE "id" = $2::uuid AND "offer" IS NOT DISTINCT FROM $3::jsonb AND "offerBinding" IS NOT DISTINCT FROM $4 AND "requestId" IS NOT DISTINCT FROM $5::uuid AND "threadId" IS NOT DISTINCT FROM $6::uuid AND "senderId" = $7::uuid AND "kind" = $8 RETURNING "id"',
                        [value, row.id, row.value.offer, row.value.offerBinding, row.value.requestId, row.value.threadId, row.value.senderId, row.value.kind],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Message offer binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "message_offer_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyMessageOfferBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
