import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { CLIENT_VEHICLE_BOUND_FIELDS, clientVehicleRecordContext, type ClientVehicleBindingColumn, type ClientVehicleValueColumn } from './client-vehicle-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type VehicleRow = { userId: string }
    & Record<ClientVehicleValueColumn, unknown | null>
    & Record<ClientVehicleBindingColumn, string | null>
type Bindings = Record<ClientVehicleBindingColumn, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'client_vehicles'

function transformRow(row: BackfillRow<VehicleRow>, requireBinding: boolean): Bindings {
    const context = clientVehicleRecordContext(row.value)
    const bindings: Bindings = { vinBinding: null, licensePlateBinding: null, internalNumberBinding: null, imageUrlBinding: null }
    for (const { value, binding } of CLIENT_VEHICLE_BOUND_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value === 'imageUrl' || existing !== null) throw new Error(`Encrypted client_vehicles.${value} record binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue('client_vehicles', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted client_vehicles.${value} is invalid.`)
        verifyPlaintextRecordBinding('client_vehicles', value, plaintext, row.id, existing, { allowLegacy: !requireBinding, context })
        bindings[binding] = existing ?? createPlaintextRecordBinding('client_vehicles', value, plaintext, row.id, context)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<VehicleRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "userId", "vin", "vinBinding", "licensePlate", "licensePlateBinding", "internalNumber", "internalNumberBinding", "imageUrl", "imageUrlBinding" FROM "client_vehicles" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & VehicleRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Client vehicle binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Client vehicle binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetClientVehicleBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "client_vehicle_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runClientVehicleBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "client_vehicle_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "client_vehicle_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "client_vehicle_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Client vehicle binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (CLIENT_VEHICLE_BOUND_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        'UPDATE "client_vehicles" SET "vinBinding" = $1, "licensePlateBinding" = $2, "internalNumberBinding" = $3, "imageUrlBinding" = $4 WHERE "id" = $5::uuid AND "userId" = $6::uuid AND "vin" IS NOT DISTINCT FROM $7 AND "vinBinding" IS NOT DISTINCT FROM $8 AND "licensePlate" IS NOT DISTINCT FROM $9 AND "licensePlateBinding" IS NOT DISTINCT FROM $10 AND "internalNumber" IS NOT DISTINCT FROM $11 AND "internalNumberBinding" IS NOT DISTINCT FROM $12 AND "imageUrl" IS NOT DISTINCT FROM $13 AND "imageUrlBinding" IS NOT DISTINCT FROM $14 RETURNING "id"',
                        [value.vinBinding, value.licensePlateBinding, value.internalNumberBinding, value.imageUrlBinding,
                            row.id, row.value.userId, row.value.vin, row.value.vinBinding,
                            row.value.licensePlate, row.value.licensePlateBinding, row.value.internalNumber,
                            row.value.internalNumberBinding, row.value.imageUrl, row.value.imageUrlBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Client vehicle binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "client_vehicle_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyClientVehicleBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
