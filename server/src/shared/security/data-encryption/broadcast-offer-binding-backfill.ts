import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { serializeBroadcastOfferSnapshot, broadcastOfferContext } from './broadcast-offer-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type OfferRow = { broadcastRequestId: string; providerId: string; locationId: string; offerSnapshot: unknown; offerSnapshotBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_broadcast_offers'
const CHECKPOINT_TABLE = 'broadcast_offer_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<OfferRow>, requireBinding: boolean): string {
    const context = broadcastOfferContext(row.value)
    const snapshot = serializeBroadcastOfferSnapshot(decryptFieldValue('autocare_broadcast_offers', 'offerSnapshot', row.value.offerSnapshot))
    verifyPlaintextRecordBinding('autocare_broadcast_offers', 'offerSnapshot', snapshot, row.id, row.value.offerSnapshotBinding,
        { allowLegacy: !requireBinding, context })
    return row.value.offerSnapshotBinding ?? createPlaintextRecordBinding('autocare_broadcast_offers', 'offerSnapshot', snapshot, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<OfferRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "broadcastRequestId", "providerId", "locationId", "offerSnapshot", "offerSnapshotBinding" FROM "autocare_broadcast_offers" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & OfferRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Broadcast offer binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Broadcast offer binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetBroadcastOfferBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runBroadcastOfferBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Broadcast offer binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.offerSnapshotBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_broadcast_offers" SET "offerSnapshotBinding" = $1 WHERE "id" = $2::uuid AND "broadcastRequestId" = $3::uuid AND "providerId" = $4::uuid AND "locationId" = $5::uuid AND "offerSnapshot" IS NOT DISTINCT FROM $6::jsonb AND "offerSnapshotBinding" IS NOT DISTINCT FROM $7 RETURNING "id"',
                        [value, row.id, row.value.broadcastRequestId, row.value.providerId, row.value.locationId,
                            row.value.offerSnapshot, row.value.offerSnapshotBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Broadcast offer binding source row changed concurrently.')
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

export async function verifyBroadcastOfferBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
