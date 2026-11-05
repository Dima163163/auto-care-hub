import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { AUTOCARE_RESCHEDULE_TEXT_FIELDS, autoCareRescheduleTextContext, type AutoCareRescheduleTextBinding, type AutoCareRescheduleTextValue } from './autocare-reschedule-text-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type RescheduleRow = { requestId: string; requestedById: string; resolvedById: string | null; status: string }
    & Record<AutoCareRescheduleTextValue, unknown | null>
    & Record<AutoCareRescheduleTextBinding, string | null>
type Bindings = Record<AutoCareRescheduleTextBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_reschedule_requests'
const CHECKPOINT_TABLE = 'autocare_reschedule_text_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<RescheduleRow>, requireBinding: boolean): Bindings {
    const bindings: Bindings = { reasonBinding: null, resolutionReasonBinding: null }
    for (const { value, binding } of AUTOCARE_RESCHEDULE_TEXT_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (existing !== null) throw new Error(`Encrypted autocare_reschedule_requests.${value} record binding is invalid.`)
            continue
        }
        const context = autoCareRescheduleTextContext(row.value, value)
        const plaintext = decryptFieldValue('autocare_reschedule_requests', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted autocare_reschedule_requests.${value} is invalid.`)
        verifyPlaintextRecordBinding('autocare_reschedule_requests', value, plaintext, row.id, existing,
            { allowLegacy: !requireBinding, context })
        bindings[binding] = existing ?? createPlaintextRecordBinding('autocare_reschedule_requests', value, plaintext, row.id, context)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<RescheduleRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "requestId", "requestedById", "resolvedById", "status", "reason", "reasonBinding", "resolutionReason", "resolutionReasonBinding" FROM "autocare_reschedule_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & RescheduleRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('AutoCare reschedule text binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('AutoCare reschedule text binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetAutoCareRescheduleTextBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runAutoCareRescheduleTextBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('AutoCare reschedule text binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (AUTOCARE_RESCHEDULE_TEXT_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_reschedule_requests" SET "reasonBinding" = $1, "resolutionReasonBinding" = $2 WHERE "id" = $3::uuid AND "requestId" = $4::uuid AND "requestedById" = $5::uuid AND "resolvedById" IS NOT DISTINCT FROM $6::uuid AND "status" = $7::autocare_reschedule_status AND "reason" IS NOT DISTINCT FROM $8::text AND "reasonBinding" IS NOT DISTINCT FROM $9 AND "resolutionReason" IS NOT DISTINCT FROM $10::text AND "resolutionReasonBinding" IS NOT DISTINCT FROM $11 RETURNING "id"',
                        [value.reasonBinding, value.resolutionReasonBinding, row.id,
                            row.value.requestId, row.value.requestedById, row.value.resolvedById, row.value.status,
                            row.value.reason, row.value.reasonBinding, row.value.resolutionReason, row.value.resolutionReasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('AutoCare reschedule text binding source row changed concurrently.')
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

export async function verifyAutoCareRescheduleTextBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
