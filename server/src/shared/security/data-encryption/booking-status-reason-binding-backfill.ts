import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { bookingStatusReasonContext, type BookingStatusReasonRecord } from './booking-status-reason-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type HistoryRow = Required<Pick<BookingStatusReasonRecord, 'bookingId' | 'status' | 'reason' | 'reasonBinding'>>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'booking_status_history'
const CHECKPOINT_TABLE = 'booking_status_reason_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<HistoryRow>, requireBinding: boolean): string | null {
    const context = bookingStatusReasonContext(row.value)
    if (row.value.reason === null) {
        if (row.value.reasonBinding !== null) throw new Error('Encrypted booking_status_history.reason record binding is invalid.')
        return null
    }
    const reason = decryptFieldValue('booking_status_history', 'reason', row.value.reason)
    if (typeof reason !== 'string') throw new Error('Encrypted booking_status_history.reason is invalid.')
    verifyPlaintextRecordBinding('booking_status_history', 'reason', reason, row.id, row.value.reasonBinding,
        { allowLegacy: !requireBinding, context })
    return row.value.reasonBinding ?? createPlaintextRecordBinding('booking_status_history', 'reason', reason, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<HistoryRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "bookingId", "status", "reason", "reasonBinding" FROM "booking_status_history" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & HistoryRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Booking status reason binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Booking status reason binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetBookingStatusReasonBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runBookingStatusReasonBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Booking status reason binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.reasonBinding) continue
                    const updated = await manager.query(
                        'UPDATE "booking_status_history" SET "reasonBinding" = $1 WHERE "id" = $2::uuid AND "bookingId" = $3::uuid AND "status" = $4::booking_status AND "reason" IS NOT DISTINCT FROM $5::text AND "reasonBinding" IS NOT DISTINCT FROM $6 RETURNING "id"',
                        [value, row.id, row.value.bookingId, row.value.status, row.value.reason, row.value.reasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Booking status reason binding source row changed concurrently.')
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

export async function verifyBookingStatusReasonBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
