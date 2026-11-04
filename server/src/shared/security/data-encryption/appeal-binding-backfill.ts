import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { appealContext, type AppealRecord } from './appeal-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type AppealRow = Required<Pick<AppealRecord,
    'subject' | 'subjectId' | 'submittedById' | 'providerId' | 'reason' | 'reasonBinding' | 'decisionReason' | 'decisionReasonBinding'>>
type Bindings = { reasonBinding: string; decisionReasonBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_appeals'
const CHECKPOINT_TABLE = 'appeal_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<AppealRow>, requireBinding: boolean): Bindings {
    const context = appealContext(row.value)
    const reason = decryptFieldValue(TABLE, 'reason', row.value.reason)
    if (typeof reason !== 'string') throw new Error('Encrypted appeal reason is invalid.')
    verifyPlaintextRecordBinding(TABLE, 'reason', reason, row.id, row.value.reasonBinding,
        { allowLegacy: !requireBinding, context })
    const reasonBinding = row.value.reasonBinding
        ?? createPlaintextRecordBinding(TABLE, 'reason', reason, row.id, context)
    let decisionReasonBinding: string | null = null
    if (row.value.decisionReason === null) {
        if (row.value.decisionReasonBinding !== null) throw new Error('Encrypted appeal decision reason binding is invalid.')
    } else {
        const decisionReason = decryptFieldValue(TABLE, 'decisionReason', row.value.decisionReason)
        if (typeof decisionReason !== 'string') throw new Error('Encrypted appeal decision reason is invalid.')
        verifyPlaintextRecordBinding(TABLE, 'decisionReason', decisionReason, row.id, row.value.decisionReasonBinding,
            { allowLegacy: !requireBinding, context })
        decisionReasonBinding = row.value.decisionReasonBinding
            ?? createPlaintextRecordBinding(TABLE, 'decisionReason', decisionReason, row.id, context)
    }
    return { reasonBinding, decisionReasonBinding }
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<AppealRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "subject", "subjectId", "submittedById", "providerId", "reason", "reasonBinding", "decisionReason", "decisionReasonBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & AppealRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Appeal binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Appeal binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetAppealBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runAppealBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query(`INSERT INTO "${CHECKPOINT_TABLE}" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`, [TABLE])
    const initial = parseCheckpoint(await source.query(
        `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    `SELECT "afterId", "processed" FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1 FOR UPDATE`, [TABLE],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Appeal binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value.reasonBinding === row.value.reasonBinding
                        && value.decisionReasonBinding === row.value.decisionReasonBinding) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "reasonBinding" = $1, "decisionReasonBinding" = $2 WHERE "id" = $3::uuid AND "subject" = $4 AND "subjectId" = $5::uuid AND "submittedById" = $6::uuid AND "providerId" IS NOT DISTINCT FROM $7::uuid AND "reason" IS NOT DISTINCT FROM $8::text AND "reasonBinding" IS NOT DISTINCT FROM $9 AND "decisionReason" IS NOT DISTINCT FROM $10::text AND "decisionReasonBinding" IS NOT DISTINCT FROM $11 RETURNING "id"`,
                        [value.reasonBinding, value.decisionReasonBinding, row.id, row.value.subject,
                            row.value.subjectId, row.value.submittedById, row.value.providerId,
                            row.value.reason, row.value.reasonBinding, row.value.decisionReason,
                            row.value.decisionReasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Appeal binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    `UPDATE "${CHECKPOINT_TABLE}" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1`,
                    [TABLE, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyAppealBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
