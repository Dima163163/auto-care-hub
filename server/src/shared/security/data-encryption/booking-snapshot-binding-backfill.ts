import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { serviceRequestRecordContext, type ServiceRequestRecordScope } from './service-request-record-scope.js'
import { serializeBookingSnapshot } from './booking-snapshot-value.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type BookingSnapshotRow = ServiceRequestRecordScope & { bookingSnapshot: unknown | null; bookingSnapshotBinding: string | null }
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'autocare_service_requests'

function transformRow(row: BackfillRow<BookingSnapshotRow>, requireBinding: boolean): string | null {
    const context = serviceRequestRecordContext(row.value)
    if (row.value.bookingSnapshot === null) {
        if (row.value.bookingSnapshotBinding !== null) throw new Error('Encrypted autocare_service_requests.bookingSnapshot record binding is invalid.')
        return null
    }
    const bookingSnapshot = serializeBookingSnapshot(decryptFieldValue('autocare_service_requests', 'bookingSnapshot', row.value.bookingSnapshot))
    verifyPlaintextRecordBinding('autocare_service_requests', 'bookingSnapshot', bookingSnapshot, row.id, row.value.bookingSnapshotBinding, {
        allowLegacy: !requireBinding,
        context,
    })
    return row.value.bookingSnapshotBinding ?? createPlaintextRecordBinding('autocare_service_requests', 'bookingSnapshot', bookingSnapshot, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<BookingSnapshotRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "bookingSnapshot", "bookingSnapshotBinding", "clientId", "providerId", "locationId", "definitionId" FROM "autocare_service_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & BookingSnapshotRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Booking snapshot binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Booking snapshot binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetBookingSnapshotBindingBackfill(source: DataSource) {
    await source.query('DELETE FROM "booking_snapshot_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME])
}

export async function runBookingSnapshotBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    await source.query('INSERT INTO "booking_snapshot_binding_backfill_checkpoints" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', [CHECKPOINT_NAME])
    const initial = parseCheckpoint(await source.query(
        'SELECT "afterId", "processed" FROM "booking_snapshot_binding_backfill_checkpoints" WHERE "name" = $1', [CHECKPOINT_NAME],
    ) as StoredCheckpoint[])
    let previous = initial
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { return transformRow(row, false) },
        async commitBatch(rows, next) {
            await source.transaction(async (manager) => {
                const stored = parseCheckpoint(await manager.query(
                    'SELECT "afterId", "processed" FROM "booking_snapshot_binding_backfill_checkpoints" WHERE "name" = $1 FOR UPDATE', [CHECKPOINT_NAME],
                ) as StoredCheckpoint[])
                if (stored.afterId !== previous.afterId || stored.processed !== previous.processed) {
                    throw new Error('Booking snapshot binding backfill checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.bookingSnapshotBinding) continue
                    const updated = await manager.query(
                        'UPDATE "autocare_service_requests" SET "bookingSnapshotBinding" = $1 WHERE "id" = $2::uuid AND "bookingSnapshot" IS NOT DISTINCT FROM $3::jsonb AND "bookingSnapshotBinding" IS NOT DISTINCT FROM $4 AND "clientId" = $5::uuid AND "providerId" = $6::uuid AND "locationId" = $7::uuid AND "definitionId" = $8::uuid RETURNING "id"',
                        [value, row.id, row.value.bookingSnapshot, row.value.bookingSnapshotBinding, row.value.clientId, row.value.providerId, row.value.locationId, row.value.definitionId],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Booking snapshot binding source row changed concurrently.')
                    }
                }
                await manager.query(
                    'UPDATE "booking_snapshot_binding_backfill_checkpoints" SET "afterId" = $2::uuid, "processed" = $3, "updatedAt" = now() WHERE "name" = $1',
                    [CHECKPOINT_NAME, next.afterId, next.processed],
                )
            })
            previous = next
        },
    }, { checkpoint: initial, ...options })
}

export async function verifyBookingSnapshotBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
