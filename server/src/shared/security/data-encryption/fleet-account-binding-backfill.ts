import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { FLEET_ACCOUNT_FIELDS, fleetAccountContext,
    type FleetAccountBinding, type FleetAccountRecord, type FleetAccountValue } from './fleet-account-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type FleetRow = Required<Pick<FleetAccountRecord, 'ownerId'>>
    & Record<FleetAccountValue, unknown> & Record<FleetAccountBinding, string | null>
type Bindings = Record<FleetAccountBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_fleet_accounts'
const CHECKPOINT_TABLE = 'fleet_account_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<FleetRow>, requireBinding: boolean): Bindings {
    const context = fleetAccountContext(row.value)
    const result: Bindings = { nameBinding: null, notesBinding: null }
    for (const { value, binding } of FLEET_ACCOUNT_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value !== 'notes' || existing !== null) throw new Error(`Encrypted fleet account ${value} binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue(TABLE, value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted fleet account ${value} is invalid.`)
        const serialized = plaintext
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<FleetRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "ownerId", "name", "nameBinding", "notes", "notesBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & FleetRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Fleet account binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Fleet account binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetFleetAccountBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runFleetAccountBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Fleet account binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (FLEET_ACCOUNT_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "nameBinding" = $1, "notesBinding" = $2 WHERE "id" = $3::uuid AND "ownerId" = $4::uuid AND "name" IS NOT DISTINCT FROM $5::text AND "nameBinding" IS NOT DISTINCT FROM $6 AND "notes" IS NOT DISTINCT FROM $7::text AND "notesBinding" IS NOT DISTINCT FROM $8 RETURNING "id"`,
                        [value.nameBinding, value.notesBinding, row.id, row.value.ownerId,
                            row.value.name, row.value.nameBinding, row.value.notes, row.value.notesBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) throw new Error('Fleet account binding source row changed concurrently.')
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

export async function verifyFleetAccountBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
