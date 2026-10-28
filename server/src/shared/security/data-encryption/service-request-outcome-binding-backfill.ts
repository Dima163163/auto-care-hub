import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { SERVICE_REQUEST_OUTCOME_FIELDS, type ServiceRequestOutcomeBinding, type ServiceRequestOutcomeValue } from './service-request-outcome-record-binding.js'
import { serviceRequestRecordContext, type ServiceRequestRecordScope } from './service-request-record-scope.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type OutcomeRow = ServiceRequestRecordScope & Record<ServiceRequestOutcomeValue, unknown | null>
    & Record<ServiceRequestOutcomeBinding, string | null>
type Bindings = Record<ServiceRequestOutcomeBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_requests'
const CHECKPOINT_TABLE = 'service_request_outcome_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<OutcomeRow>, requireBinding: boolean): Bindings {
    const context = serviceRequestRecordContext(row.value)
    const bindings: Bindings = { cancellationReasonBinding: null, noShowReasonBinding: null, completionNoteBinding: null }
    for (const { value, binding } of SERVICE_REQUEST_OUTCOME_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (existing !== null) throw new Error(`Encrypted autocare_service_requests.${value} record binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue('autocare_service_requests', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted autocare_service_requests.${value} is invalid.`)
        verifyPlaintextRecordBinding('autocare_service_requests', value, plaintext, row.id, existing, { allowLegacy: !requireBinding, context })
        bindings[binding] = existing ?? createPlaintextRecordBinding('autocare_service_requests', value, plaintext, row.id, context)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<OutcomeRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "clientId", "providerId", "locationId", "definitionId", "cancellationReason", "cancellationReasonBinding", "noShowReason", "noShowReasonBinding", "completionNote", "completionNoteBinding" FROM "autocare_service_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & OutcomeRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Service request outcome binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Service request outcome binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetServiceRequestOutcomeBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runServiceRequestOutcomeBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Service request outcome binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (SERVICE_REQUEST_OUTCOME_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_requests" SET "cancellationReasonBinding" = $1, "noShowReasonBinding" = $2, "completionNoteBinding" = $3 WHERE "id" = $4::uuid AND "clientId" = $5::uuid AND "providerId" = $6::uuid AND "locationId" = $7::uuid AND "definitionId" = $8::uuid AND "cancellationReason" IS NOT DISTINCT FROM $9::text AND "cancellationReasonBinding" IS NOT DISTINCT FROM $10 AND "noShowReason" IS NOT DISTINCT FROM $11::text AND "noShowReasonBinding" IS NOT DISTINCT FROM $12 AND "completionNote" IS NOT DISTINCT FROM $13::text AND "completionNoteBinding" IS NOT DISTINCT FROM $14 RETURNING "id"',
                        [value.cancellationReasonBinding, value.noShowReasonBinding, value.completionNoteBinding,
                            row.id, row.value.clientId, row.value.providerId, row.value.locationId, row.value.definitionId,
                            row.value.cancellationReason, row.value.cancellationReasonBinding, row.value.noShowReason,
                            row.value.noShowReasonBinding, row.value.completionNote, row.value.completionNoteBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Service request outcome binding source row changed concurrently.')
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

export async function verifyServiceRequestOutcomeBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
