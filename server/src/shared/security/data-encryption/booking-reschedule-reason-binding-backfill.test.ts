import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetBookingRescheduleReasonBindingBackfill, runBookingRescheduleReasonBindingBackfill, verifyBookingRescheduleReasonBindings } from './booking-reschedule-reason-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const bookingId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'booking-reschedule-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 57),
    getKey: () => ({ kek: Buffer.alloc(32, 58) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = { bookingId, requestedById: id, resolvedById: bookingId, status: 'rejected', resolutionReason: encryptFieldValue('booking_reschedule_requests', 'resolutionReason', 'Changed plans'), resolutionReasonBinding: null as string | null }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "booking_reschedule_reason_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "booking_reschedule_reason_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "bookingId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "booking_reschedule_requests" SET "resolutionReasonBinding"')) {
            if (conflict || String(params[1]) !== id || params[2] !== row.bookingId
                || params[3] !== row.requestedById || params[4] !== row.resolvedById || params[5] !== row.status
                || JSON.stringify(params[6]) !== JSON.stringify(row.resolutionReason)
                || params[7] !== row.resolutionReasonBinding) return [[], 0]
            row.resolutionReasonBinding = params[0] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "booking_reschedule_reason_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('booking reschedule reason binding backfill', () => {
    it('resumes, verifies and rejects changed booking scope', async () => {
        const fake = fakeSource()
        expect(await runBookingRescheduleReasonBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.resolutionReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runBookingRescheduleReasonBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyBookingRescheduleReasonBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.bookingId = id
        await expect(verifyBookingRescheduleReasonBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetBookingRescheduleReasonBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runBookingRescheduleReasonBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Booking reschedule reason binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
