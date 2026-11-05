import type { DataSource } from 'typeorm'
import { decryptFieldValue } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { BOOKING_TEXT_FIELDS, bookingTextContext, type BookingTextBinding, type BookingTextValue } from './booking-text-record-binding.js'
import { runBoundedBackfill, type BackfillCheckpoint, type BackfillRow } from './bounded-backfill.js'

type BookingTextRow = { clientId: string; cabinetId: string; serviceId: string }
    & Record<BookingTextValue, unknown | null> & Record<BookingTextBinding, string | null>
type Bindings = Record<BookingTextBinding, string | null>
type StoredCheckpoint = { afterId: string | null; processed: string }
const CHECKPOINT_NAME = 'bookings'
const CHECKPOINT_TABLE = 'booking_text_binding_backfill_checkpoints'

function transformRow(row: BackfillRow<BookingTextRow>, requireBinding: boolean): Bindings {
    const context = bookingTextContext(row.value)
    const bindings: Bindings = { commentBinding: null, cancellationReasonBinding: null, ownerNoteBinding: null }
    for (const { value, binding } of BOOKING_TEXT_FIELDS) {
        const raw = row.value[value]
        const existing = row.value[binding]
        if (raw === null) {
            if (existing !== null) throw new Error(`Encrypted bookings.${value} record binding is invalid.`)
            continue
        }
        const plaintext = decryptFieldValue('bookings', value, raw)
        if (typeof plaintext !== 'string') throw new Error(`Encrypted bookings.${value} is invalid.`)
        verifyPlaintextRecordBinding('bookings', value, plaintext, row.id, existing, { allowLegacy: !requireBinding, context })
        bindings[binding] = existing ?? createPlaintextRecordBinding('bookings', value, plaintext, row.id, context)
    }
    return bindings
}

async function readBatch(source: DataSource, afterId: string | null, limit: number): Promise<BackfillRow<BookingTextRow>[]> {
    const predicate = afterId ? 'WHERE "id" > $1::uuid' : ''
    const rows = await source.query(
        `SELECT "id", "clientId", "cabinetId", "serviceId", "comment", "commentBinding", "cancellationReason", "cancellationReasonBinding", "ownerNote", "ownerNoteBinding" FROM "bookings" ${predicate} ORDER BY "id" ASC LIMIT $${afterId ? 2 : 1}`,
        afterId ? [afterId, limit] : [limit],
    ) as Array<{ id: string } & BookingTextRow>
    return rows.map(({ id, ...value }) => ({ id, value }))
}

function parseCheckpoint(rows: StoredCheckpoint[]): BackfillCheckpoint {
    const current = rows[0]
    if (!current) throw new Error('Booking text binding backfill checkpoint is missing.')
    const processed = Number(current.processed)
    if (!Number.isSafeInteger(processed) || processed < 0) throw new Error('Booking text binding backfill checkpoint is invalid.')
    return { afterId: current.afterId, processed }
}

export async function resetBookingTextBindingBackfill(source: DataSource) {
    await source.query(`DELETE FROM "${CHECKPOINT_TABLE}" WHERE "name" = $1`, [CHECKPOINT_NAME])
}

export async function runBookingTextBindingBackfill(source: DataSource, options: { batchSize: number; maxBatches: number }) {
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
                    throw new Error('Booking text binding checkpoint changed concurrently.')
                }
                for (const { source: row, value } of rows) {
                    if (BOOKING_TEXT_FIELDS.every(({ binding }) => value[binding] === row.value[binding])) continue
                    const updated = await manager.query(
                        'UPDATE "bookings" SET "commentBinding" = $1, "cancellationReasonBinding" = $2, "ownerNoteBinding" = $3 WHERE "id" = $4::uuid AND "clientId" = $5::uuid AND "cabinetId" = $6::uuid AND "serviceId" = $7::uuid AND "comment" IS NOT DISTINCT FROM $8::text AND "commentBinding" IS NOT DISTINCT FROM $9 AND "cancellationReason" IS NOT DISTINCT FROM $10::text AND "cancellationReasonBinding" IS NOT DISTINCT FROM $11 AND "ownerNote" IS NOT DISTINCT FROM $12::text AND "ownerNoteBinding" IS NOT DISTINCT FROM $13 RETURNING "id"',
                        [value.commentBinding, value.cancellationReasonBinding, value.ownerNoteBinding,
                            row.id, row.value.clientId, row.value.cabinetId, row.value.serviceId,
                            row.value.comment, row.value.commentBinding, row.value.cancellationReason,
                            row.value.cancellationReasonBinding, row.value.ownerNote, row.value.ownerNoteBinding],
                    ) as [Array<{ id: string }>, number]
                    if (updated[1] !== 1 || updated[0].length !== 1) {
                        throw new Error('Booking text binding source row changed concurrently.')
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

export async function verifyBookingTextBindings(source: DataSource, options: { batchSize: number; maxBatches: number }) {
    return runBoundedBackfill({
        readBatch: (afterId, limit) => readBatch(source, afterId, limit),
        async transform(row) { transformRow(row, true); return null },
        async commitBatch() {},
    }, { checkpoint: { afterId: null, processed: 0 }, ...options })
}
