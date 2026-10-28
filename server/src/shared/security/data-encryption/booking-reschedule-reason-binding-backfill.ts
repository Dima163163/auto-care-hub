import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { bookingRescheduleReasonContext, type BookingRescheduleReasonRecord } from './booking-reschedule-reason-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type RescheduleRow = Required<Pick<BookingRescheduleReasonRecord, 'bookingId' | 'requestedById' | 'resolvedById' | 'status' | 'resolutionReason' | 'resolutionReasonBinding'>>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'booking_reschedule_requests'
const CHECKPOINT_TABLE = 'booking_reschedule_reason_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<RescheduleRow>, requireBinding: boolean): string | null {
    const context = bookingRescheduleReasonContext(row.value)
    if (row.value.resolutionReason === null) {
        if (row.value.resolutionReasonBinding !== null) throw new Error('Encrypted booking_reschedule_requests.resolutionReason record binding is invalid.')
        return null
    }
    const reason = decryptFieldValue('booking_reschedule_requests', 'resolutionReason', row.value.resolutionReason)
    if (typeof reason !== 'string') throw new Error('Encrypted booking_reschedule_requests.resolutionReason is invalid.')
    verifyPlaintextRecordBinding('booking_reschedule_requests', 'resolutionReason', reason, row.id, row.value.resolutionReasonBinding,
        { allowLegacy: !requireBinding, context })
    return row.value.resolutionReasonBinding ?? createPlaintextRecordBinding('booking_reschedule_requests', 'resolutionReason', reason, row.id, context)
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<RescheduleRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "bookingId", "requestedById", "resolvedById", "status", "resolutionReason", "resolutionReasonBinding" FROM "booking_reschedule_requests" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & RescheduleRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Booking reschedule reason binding checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Booking reschedule reason binding checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetBookingRescheduleReasonBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runBookingRescheduleReasonBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Booking reschedule reason binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (value === row.value.resolutionReasonBinding) continue
                    const updated = await manager.query(
                        'UPDATE "booking_reschedule_requests" SET "resolutionReasonBinding" = $1 WHERE "id" = $2::uuid AND "bookingId" = $3::uuid AND "requestedById" = $4::uuid AND "resolvedById" IS NOT DISTINCT FROM $5::uuid AND "status" = $6::booking_reschedule_status AND "resolutionReason" IS NOT DISTINCT FROM $7::text AND "resolutionReasonBinding" IS NOT DISTINCT FROM $8 RETURNING "id"',
                        [value, row.id, row.value.bookingId, row.value.requestedById, row.value.resolvedById, row.value.status, row.value.resolutionReason, row.value.resolutionReasonBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Booking reschedule reason binding source row changed concurrently.')
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

export async function verifyBookingRescheduleReasonBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
