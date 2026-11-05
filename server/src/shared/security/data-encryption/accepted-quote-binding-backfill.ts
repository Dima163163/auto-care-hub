import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { serviceRequestRecordContext, type ServiceRequestRecordScope } from './service-request-record-scope.js'
import { serializeAcceptedQuote } from './accepted-quote-value.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type AcceptedQuoteRow = ServiceRequestRecordScope & { acceptedQuoteSnapshot: unknown | null; acceptedQuoteSnapshotBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_requests'

function transformRow(row: BackfillRow<AcceptedQuoteRow>, requireBinding: boolean): string | null {
    const context = serviceRequestRecordContext(row.value)
    if (row.value.acceptedQuoteSnapshot === null) {
        if (row.value.acceptedQuoteSnapshotBinding !== null) throw new Error('Encrypted autocare_service_requests.acceptedQuoteSnapshot record binding is invalid.')
        return null
    }
    const acceptedQuoteSnapshot = serializeAcceptedQuote(decryptFieldValue('autocare_service_requests', 'acceptedQuoteSnapshot', row.value.acceptedQuoteSnapshot))
    verifyPlaintextRecordBinding('autocare_service_requests', 'acceptedQuoteSnapshot', acceptedQuoteSnapshot, row.id, row.value.acceptedQuoteSnapshotBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.acceptedQuoteSnapshotBinding ?? createPlaintextRecordBinding('autocare_service_requests', 'acceptedQuoteSnapshot', acceptedQuoteSnapshot, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<AcceptedQuoteRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "acceptedQuoteSnapshot", "acceptedQuoteSnapshotBinding", "clientId", "providerId", "locationId", "definitionId" FROM "autocare_service_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & AcceptedQuoteRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Accepted quote binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Accepted quote binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetAcceptedQuoteBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "accepted_quote_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runAcceptedQuoteBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "accepted_quote_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "accepted_quote_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "accepted_quote_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Accepted quote binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.acceptedQuoteSnapshotBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_requests" SET "acceptedQuoteSnapshotBinding" = $1 WHERE "id" = $2::uuid AND "acceptedQuoteSnapshot" IS NOT DISTINCT FROM $3::jsonb AND "acceptedQuoteSnapshotBinding" IS NOT DISTINCT FROM $4 AND "clientId" = $5::uuid AND "providerId" = $6::uuid AND "locationId" = $7::uuid AND "definitionId" = $8::uuid RETURNING "id"',
                        [value, row.id, row.value.acceptedQuoteSnapshot, row.value.acceptedQuoteSnapshotBinding, row.value.clientId, row.value.providerId, row.value.locationId, row.value.definitionId],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Accepted quote binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "accepted_quote_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyAcceptedQuoteBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
