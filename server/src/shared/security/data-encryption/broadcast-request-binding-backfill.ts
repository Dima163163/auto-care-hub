import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { BROADCAST_REQUEST_FIELDS, broadcastRequestContext, serializeBroadcastRequestField,
    type BroadcastRequestBinding, type BroadcastRequestRecord, type BroadcastRequestValue } from './broadcast-request-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type RequestRow = Required<Pick<BroadcastRequestRecord, 'clientId' | 'serviceDefinitionId'>>
    & { marketId: string | null }
    & Record<BroadcastRequestValue, unknown> & Record<BroadcastRequestBinding, string | null>
type Bindings = Record<BroadcastRequestBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const TABLE = 'autocare_broadcast_requests'
const CHECKPOINT_TABLE = 'broadcast_request_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<RequestRow>, requireBinding: boolean): Bindings {
    const context = broadcastRequestContext(row.value)
    const result: Bindings = { issueDescriptionBinding: null, vehicleSnapshotBinding: null }
    for (const { value, binding } of BROADCAST_REQUEST_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (value !== 'vehicleSnapshot' || existing !== null) throw new Error(`Encrypted broadcast request ${value} binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue(TABLE, value, raw)
        const serialized = serializeBroadcastRequestField(value, plaintext)
        verifyPlaintextRecordBinding(TABLE, value, serialized, row.id, existing,
            { allowLegacy: !requireBinding, context })
        result[binding] = existing ?? createPlaintextRecordBinding(TABLE, value, serialized, row.id, context)
    }
    return result
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<RequestRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "clientId", "serviceDefinitionId", "marketId", "issueDescription", "issueDescriptionBinding", "vehicleSnapshot", "vehicleSnapshotBinding" FROM "${TABLE}" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & RequestRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Broadcast request binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Broadcast request binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetBroadcastRequestBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [TABLE])
}

export async function runBroadcastRequestBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Broadcast request binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (BROADCAST_REQUEST_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        `UPDATE "${TABLE}" SET "issueDescriptionBinding" = $1, "vehicleSnapshotBinding" = $2 WHERE "id" = $3::uuid AND "clientId" = $4::uuid AND "serviceDefinitionId" = $5::uuid AND "marketId" IS NOT DISTINCT FROM $6::uuid AND "issueDescription" IS NOT DISTINCT FROM $7::text AND "issueDescriptionBinding" IS NOT DISTINCT FROM $8 AND "vehicleSnapshot" IS NOT DISTINCT FROM $9::jsonb AND "vehicleSnapshotBinding" IS NOT DISTINCT FROM $10 RETURNING "id"`,
                        [value.issueDescriptionBinding, value.vehicleSnapshotBinding, row.id,
                            row.value.clientId, row.value.serviceDefinitionId, row.value.marketId,
                            row.value.issueDescription, row.value.issueDescriptionBinding,
                            row.value.vehicleSnapshot, row.value.vehicleSnapshotBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) throw new Error('Broadcast request binding source row changed concurrently.')
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

export async function verifyBroadcastRequestBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
