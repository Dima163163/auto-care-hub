import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { serializeServiceQuoteSnapshot, serviceQuoteSnapshotContext } from './service-quote-snapshot-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type QuoteRow = { requestId: string; providerId: string; version: number; snapshot: unknown; snapshotBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_quotes'
const CHECKPOINT_TABLE = 'service_quote_snapshot_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<QuoteRow>, requireBinding: boolean): string {
    const context = serviceQuoteSnapshotContext(row.value)
    const snapshot = serializeServiceQuoteSnapshot(decryptFieldValue('autocare_service_quotes', 'snapshot', row.value.snapshot))
    verifyPlaintextRecordBinding('autocare_service_quotes', 'snapshot', snapshot, row.id, row.value.snapshotBinding,
        { allowLegacy: !requireBinding, context })
    return row.value.snapshotBinding ?? createPlaintextRecordBinding('autocare_service_quotes', 'snapshot', snapshot, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<QuoteRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "requestId", "providerId", "version", "snapshot", "snapshotBinding" FROM "autocare_service_quotes" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & QuoteRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Service quote snapshot binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Service quote snapshot binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetServiceQuoteSnapshotBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runServiceQuoteSnapshotBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Service quote snapshot binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.snapshotBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_quotes" SET "snapshotBinding" = $1 WHERE "id" = $2::uuid AND "requestId" = $3::uuid AND "providerId" = $4::uuid AND "version" = $5 AND "snapshot" IS NOT DISTINCT FROM $6::jsonb AND "snapshotBinding" IS NOT DISTINCT FROM $7 RETURNING "id"',
                        [value, row.id, row.value.requestId, row.value.providerId, row.value.version,
                            row.value.snapshot, row.value.snapshotBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Service quote snapshot binding source row changed concurrently.')
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

export async function verifyServiceQuoteSnapshotBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
