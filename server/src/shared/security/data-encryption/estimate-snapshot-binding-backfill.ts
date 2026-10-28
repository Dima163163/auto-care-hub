import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { serviceRequestRecordContext, type ServiceRequestRecordScope } from './service-request-record-scope.js'
import { serializeEstimateSnapshot } from './estimate-snapshot-value.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type EstimateSnapshotRow = ServiceRequestRecordScope & { estimateSnapshot: unknown | null; estimateSnapshotBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_requests'

function transformRow(row: BackfillRow<EstimateSnapshotRow>, requireBinding: boolean): string | null {
    const context = serviceRequestRecordContext(row.value)
    if (row.value.estimateSnapshot === null) {
        if (row.value.estimateSnapshotBinding !== null) throw new Error('Encrypted autocare_service_requests.estimateSnapshot record binding is invalid.')
        return null
    }
    const estimateSnapshot = serializeEstimateSnapshot(decryptFieldValue('autocare_service_requests', 'estimateSnapshot', row.value.estimateSnapshot))
    verifyPlaintextRecordBinding('autocare_service_requests', 'estimateSnapshot', estimateSnapshot, row.id, row.value.estimateSnapshotBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.estimateSnapshotBinding ?? createPlaintextRecordBinding('autocare_service_requests', 'estimateSnapshot', estimateSnapshot, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<EstimateSnapshotRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "estimateSnapshot", "estimateSnapshotBinding", "clientId", "providerId", "locationId", "definitionId" FROM "autocare_service_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & EstimateSnapshotRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Estimate snapshot binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Estimate snapshot binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetEstimateSnapshotBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "estimate_snapshot_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runEstimateSnapshotBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "estimate_snapshot_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "estimate_snapshot_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "estimate_snapshot_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Estimate snapshot binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.estimateSnapshotBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_requests" SET "estimateSnapshotBinding" = $1 WHERE "id" = $2::uuid AND "estimateSnapshot" IS NOT DISTINCT FROM $3::jsonb AND "estimateSnapshotBinding" IS NOT DISTINCT FROM $4 AND "clientId" = $5::uuid AND "providerId" = $6::uuid AND "locationId" = $7::uuid AND "definitionId" = $8::uuid RETURNING "id"',
                        [value, row.id, row.value.estimateSnapshot, row.value.estimateSnapshotBinding, row.value.clientId, row.value.providerId, row.value.locationId, row.value.definitionId],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Estimate snapshot binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "estimate_snapshot_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyEstimateSnapshotBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
