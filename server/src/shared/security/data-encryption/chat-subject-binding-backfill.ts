import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { chatThreadRecordContext, type ChatThreadRecordScope } from './chat-thread-record-scope.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type ChatSubjectRow = ChatThreadRecordScope & { subject: string | null; subjectBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_chat_threads'

function transformRow(row: BackfillRow<ChatSubjectRow>, requireBinding: boolean): string | null {
    const context = chatThreadRecordContext(row.value)
    if (row.value.subject === null) {
        if (row.value.subjectBinding !== null) throw new Error('Encrypted autocare_chat_threads.subject record binding is invalid.')
        return null
    }
    const subject = decryptFieldValue<string>('autocare_chat_threads', 'subject', row.value.subject)
    if (typeof subject !== 'string') throw new Error('Encrypted autocare_chat_threads.subject is invalid.')
    verifyPlaintextRecordBinding('autocare_chat_threads', 'subject', subject, row.id, row.value.subjectBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.subjectBinding ?? createPlaintextRecordBinding('autocare_chat_threads', 'subject', subject, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<ChatSubjectRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "subject", "subjectBinding", "type", "requestId", "providerId", "clientId", "createdById" FROM "autocare_chat_threads" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & ChatSubjectRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Chat subject binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Chat subject binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetChatSubjectBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "chat_subject_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runChatSubjectBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "chat_subject_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "chat_subject_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "chat_subject_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Chat subject binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.subjectBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_chat_threads" SET "subjectBinding" = $1 WHERE "id" = $2::uuid AND "subject" IS NOT DISTINCT FROM $3 AND "subjectBinding" IS NOT DISTINCT FROM $4 AND "type" = $5 AND "requestId" IS NOT DISTINCT FROM $6::uuid AND "providerId" IS NOT DISTINCT FROM $7::uuid AND "clientId" IS NOT DISTINCT FROM $8::uuid AND "createdById" IS NOT DISTINCT FROM $9::uuid RETURNING "id"',
                        [value, row.id, row.value.subject, row.value.subjectBinding, row.value.type, row.value.requestId, row.value.providerId, row.value.clientId, row.value.createdById],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Chat subject binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "chat_subject_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyChatSubjectBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
