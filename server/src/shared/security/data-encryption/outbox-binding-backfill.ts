import type { DataSource } from 'typeorm'
import { hasOutboxRecipientFields, isEncryptedFieldEnvelope, openOutboxPayloadForBindingBackfill, outboxPayloadEncryptionTransformer, setOutboxPayloadRecordId, verifyOutboxPayloadRecordBinding } from './field-encryption.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type OutboxRow = { payload: Record<string, unknown> }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'outbox_events'

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Outbox binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Outbox binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<OutboxRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "payload" FROM "outbox_events" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string; payload: Record<string, unknown> }>
    return rows.map(({ id, payload }) => ({ id, value: { payload } }))
}

function hasLegacyRecipient(value: unknown): boolean {
    if (Array.isArray(value)) return value.some(hasLegacyRecipient)
    if (!value || typeof value !== 'object') return false
    const payload = value as Record<string, unknown>
    for (const [key, item] of Object.entries(payload)) {
        if (['email', 'toEmail', 'recipientName'].includes(key)
            && typeof item === 'string' && payload[`${key}Ciphertext`] === undefined) return true
        if (['emailCiphertext', 'toEmailCiphertext', 'recipientNameCiphertext'].includes(key)
            && (!isEncryptedFieldEnvelope(item) || !Object.hasOwn(item, 'recordBinding'))) return true
        if (hasLegacyRecipient(item)) return true
    }
    return false
}

export async function resetOutboxBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "outbox_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runOutboxBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "outbox_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "outbox_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) {
            const stored = row.value.payload
            if (!hasOutboxRecipientFields(stored)) return stored
            const opened = openOutboxPayloadForBindingBackfill(stored, row.id)
            if (stored.$recordId === row.id && !hasLegacyRecipient(stored)) {
                verifyOutboxPayloadRecordBinding(stored, row.id)
                return stored
            }
            return outboxPayloadEncryptionTransformer.to(setOutboxPayloadRecordId(opened, row.id)) as Record<string, unknown>
        },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const current = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "outbox_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (current.afterId !== previous.afterId || current.processed !== previous.processed) {
                    throw new Error('Outbox binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.payload) continue
                    const updated = await manager.query(
                        'UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2::uuid AND "payload" = $3::jsonb RETURNING "id"',
                        [JSON.stringify(value), row.id, JSON.stringify(row.value.payload)],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Outbox binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "outbox_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyOutboxBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) {
            verifyOutboxPayloadRecordBinding(row.value.payload, row.id)
            return null
        },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
