import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { serviceRequestVehicleRecordContext, type ServiceRequestVehicleRecordScope } from './service-request-record-scope.js'
import { serializeVehicleSnapshot } from './vehicle-snapshot-value.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type VehicleSnapshotRow = ServiceRequestVehicleRecordScope & { vehicleSnapshot: unknown | null; vehicleSnapshotBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_requests'

function transformRow(row: BackfillRow<VehicleSnapshotRow>, requireBinding: boolean): string | null {
    const context = serviceRequestVehicleRecordContext(row.value)
    if (row.value.vehicleSnapshot === null) {
        if (row.value.vehicleSnapshotBinding !== null) throw new Error('Encrypted autocare_service_requests.vehicleSnapshot record binding is invalid.')
        return null
    }
    const vehicleSnapshot = serializeVehicleSnapshot(decryptFieldValue('autocare_service_requests', 'vehicleSnapshot', row.value.vehicleSnapshot))
    verifyPlaintextRecordBinding('autocare_service_requests', 'vehicleSnapshot', vehicleSnapshot, row.id, row.value.vehicleSnapshotBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.vehicleSnapshotBinding ?? createPlaintextRecordBinding('autocare_service_requests', 'vehicleSnapshot', vehicleSnapshot, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<VehicleSnapshotRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "vehicleSnapshot", "vehicleSnapshotBinding", "clientId", "providerId", "locationId", "definitionId", "vehicleId" FROM "autocare_service_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & VehicleSnapshotRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Vehicle snapshot binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Vehicle snapshot binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetVehicleSnapshotBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "vehicle_snapshot_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runVehicleSnapshotBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "vehicle_snapshot_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "vehicle_snapshot_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "vehicle_snapshot_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Vehicle snapshot binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.vehicleSnapshotBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_requests" SET "vehicleSnapshotBinding" = $1 WHERE "id" = $2::uuid AND "vehicleSnapshot" IS NOT DISTINCT FROM $3::jsonb AND "vehicleSnapshotBinding" IS NOT DISTINCT FROM $4 AND "clientId" = $5::uuid AND "providerId" = $6::uuid AND "locationId" = $7::uuid AND "definitionId" = $8::uuid AND "vehicleId" IS NOT DISTINCT FROM $9::uuid RETURNING "id"',
                        [value, row.id, row.value.vehicleSnapshot, row.value.vehicleSnapshotBinding, row.value.clientId, row.value.providerId, row.value.locationId, row.value.definitionId, row.value.vehicleId],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Vehicle snapshot binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "vehicle_snapshot_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyVehicleSnapshotBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
