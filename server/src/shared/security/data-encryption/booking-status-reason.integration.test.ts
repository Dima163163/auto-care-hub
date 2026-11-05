import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { AppDataSource } from '../../../database/data-source.js'
import { BookingStatusHistoryEntity } from '../../../entities/booking/booking-status-history.entity.js'
import { BookingStatus } from '../../../entities/booking/booking.entity.js'
import { resetBookingStatusReasonBindingBackfill, runBookingStatusReasonBindingBackfill, verifyBookingStatusReasonBindings } from './booking-status-reason-binding-backfill.js'

describe('booking status reason record binding integration', () => {
    it('rejects a copied ciphertext/binding and backfills legacy history', async () => {
        const history = AppDataSource.getRepository(BookingStatusHistoryEntity)
        const source = await history.save(history.create({
            bookingId: randomUUID(), status: BookingStatus.Cancelled,
            changedById: null, reason: 'Client cancelled the booking',
        }))
        const target = await history.save(history.create({
            bookingId: randomUUID(), status: BookingStatus.Cancelled,
            changedById: null, reason: 'Different cancellation reason',
        }))
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING
        try {
            const [storedSource] = await AppDataSource.query(
                'SELECT "reason", "reasonBinding" FROM "booking_status_history" WHERE "id" = $1', [source.id],
            ) as Array<{ reason: string; reasonBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "reason", "reasonBinding" FROM "booking_status_history" WHERE "id" = $1', [target.id],
            ) as Array<{ reason: string; reasonBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic booking status history is missing.')
            expect(storedSource.reason).not.toContain('Client cancelled the booking')
            expect(storedSource.reasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query(
                'UPDATE "booking_status_history" SET "reason" = $1::text, "reasonBinding" = $2 WHERE "id" = $3',
                [storedSource.reason, storedSource.reasonBinding, target.id],
            )
            await expect(history.findOneByOrFail({ id: target.id }))
                .rejects.toThrow('Encrypted record binding authentication failed.')
            await AppDataSource.query(
                'UPDATE "booking_status_history" SET "reason" = $1::text, "reasonBinding" = $2 WHERE "id" = $3',
                [storedTarget.reason, storedTarget.reasonBinding, target.id],
            )
            await AppDataSource.query('UPDATE "booking_status_history" SET "reasonBinding" = NULL WHERE "id" = $1', [source.id])
            await resetBookingStatusReasonBindingBackfill(AppDataSource)
            process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING = 'true'
            await expect(history.findOneByOrFail({ id: source.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING
            expect((await runBookingStatusReasonBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyBookingStatusReasonBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING = 'true'
            expect((await history.findOneByOrFail({ id: source.id })).reason).toBe('Client cancelled the booking')
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING = previousStrict
            await resetBookingStatusReasonBindingBackfill(AppDataSource)
            await history.delete({ id: target.id })
            await history.delete({ id: source.id })
        }
    })
})
