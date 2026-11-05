import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetBookingStatusReasonBindingBackfill, runBookingStatusReasonBindingBackfill, verifyBookingStatusReasonBindings } from './booking-status-reason-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const bookingId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'booking-status-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 57),
    getKey: () => ({ kek: Buffer.alloc(32, 58) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = { bookingId, status: 'cancelled', reason: encryptFieldValue('booking_status_history', 'reason', 'Changed plans'), reasonBinding: null as string | null }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "booking_status_reason_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "booking_status_reason_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "bookingId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "booking_status_history" SET "reasonBinding"')) {
            if (conflict || String(params[1]) !== id || params[2] !== row.bookingId || params[3] !== row.status
                || JSON.stringify(params[4]) !== JSON.stringify(row.reason) || params[5] !== row.reasonBinding) return [[], 0]
            row.reasonBinding = params[0] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "booking_status_reason_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('booking status reason binding backfill', () => {
    it('resumes, verifies and rejects changed booking scope', async () => {
        const fake = fakeSource()
        expect(await runBookingStatusReasonBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.reasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runBookingStatusReasonBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyBookingStatusReasonBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.bookingId = id
        await expect(verifyBookingStatusReasonBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetBookingStatusReasonBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runBookingStatusReasonBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Booking status reason binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
