import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { FLEET_VEHICLE_FIELDS, fleetVehicleContext, serializeFleetVehicleField,
    type FleetVehicleBinding, type FleetVehicleRecord, type FleetVehicleValue } from './fleet-vehicle-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type VehicleRow = Required<Pick<FleetVehicleRecord, 'fleetId'>>
    & Record<FleetVehicleValue, unknown> & Record<FleetVehicleBinding, string | null>
type Bindings = Record<FleetVehicleBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_fleet_vehicles'
const CHECKPOINT_TABLE = 'fleet_vehicle_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<VehicleRow>, requireBinding: boolean): Bindings {
    const context = fleetVehicleContext(row.value)
    const result: Bindings = { labelBinding: null, vehicleSnapshotBinding: null }
    for (const { value, binding } of FLEET_VEHICLE_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) throw new Error(`Encrypted fleet vehicle ${value} is invalid.`)
        const plaintext = decryptFieldValue(TABLE, value, raw)
        const serialized = serializeFleetVehicleField(value, plaintext)
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<VehicleRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "fleetId", "label", "labelBinding", "vehicleSnapshot", "vehicleSnapshotBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & VehicleRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Fleet vehicle binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Fleet vehicle binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetFleetVehicleBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runFleetVehicleBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Fleet vehicle binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (FLEET_VEHICLE_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "labelBinding" = $1, "vehicleSnapshotBinding" = $2 WHERE "id" = $3::uuid AND "fleetId" = $4::uuid AND "label" IS NOT DISTINCT FROM $5::text AND "labelBinding" IS NOT DISTINCT FROM $6 AND "vehicleSnapshot" IS NOT DISTINCT FROM $7::jsonb AND "vehicleSnapshotBinding" IS NOT DISTINCT FROM $8 RETURNING "id"`,
                        [value.labelBinding, value.vehicleSnapshotBinding, row.id, row.value.fleetId,
                            row.value.label, row.value.labelBinding, row.value.vehicleSnapshot, row.value.vehicleSnapshotBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) throw new Error('Fleet vehicle binding source row changed concurrently.')
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

export async function verifyFleetVehicleBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
