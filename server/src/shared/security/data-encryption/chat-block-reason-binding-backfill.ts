import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { chatBlockReasonContext, type ChatBlockReasonRecord } from './chat-block-reason-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type BlockRow = Required<Pick<ChatBlockReasonRecord, 'threadId' | 'blockerId' | 'blockedUserId' | 'reason' | 'reasonBinding'>>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_chat_blocks'
const CHECKPOINT_TABLE = 'chat_block_reason_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<BlockRow>, requireBinding: boolean): string | null {
    const context = chatBlockReasonContext(row.value)
    if (row.value.reason === null) {
        if (row.value.reasonBinding !== null) throw new Error('Encrypted autocare_chat_blocks.reason record binding is invalid.')
        return null
    }
    const reason = decryptFieldValue('autocare_chat_blocks', 'reason', row.value.reason)
    if (typeof reason !== 'string') throw new Error('Encrypted autocare_chat_blocks.reason is invalid.')
    verifyPlaintextRecordBinding('autocare_chat_blocks', 'reason', reason, row.id, row.value.reasonBinding,
        { allowLegacy: !requireBinding, context })
    return row.value.reasonBinding ?? createPlaintextRecordBinding('autocare_chat_blocks', 'reason', reason, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<BlockRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "threadId", "blockerId", "blockedUserId", "reason", "reasonBinding" FROM "autocare_chat_blocks" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & BlockRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Chat block reason binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Chat block reason binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetChatBlockReasonBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runChatBlockReasonBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query(`INSERT INTO "${CHECKPOINT_TABLE}" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`, [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1 FOR UPDATE`, [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Chat block reason binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.reasonBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_chat_blocks" SET "reasonBinding" = $1 WHERE "id" = $2::uuid AND "threadId" = $3::uuid AND "blockerId" = $4::uuid AND "blockedUserId" = $5::uuid AND "reason" IS NOT DISTINCT FROM $6::text AND "reasonBinding" IS NOT DISTINCT FROM $7 RETURNING "id"',
                        [value, row.id, row.value.threadId, row.value.blockerId, row.value.blockedUserId,
                            row.value.reason, row.value.reasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Chat block reason binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    `UPDATE "${CHECKPOINT_TABLE}" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1`,
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyChatBlockReasonBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
