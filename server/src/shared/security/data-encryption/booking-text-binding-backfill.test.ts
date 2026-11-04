import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetBookingTextBindingBackfill, runBookingTextBindingBackfill, verifyBookingTextBindings } from './booking-text-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const scope = { clientId: firstId, cabinetId: secondId, serviceId: firstId }

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'booking-text-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 57),
    getKey: () => ({ kek: Buffer.alloc(32, 58) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { ...scope,
            comment: encryptFieldValue('bookings', 'comment', 'Call before arrival'),
            commentBinding: null as string | null,
            cancellationReason: encryptFieldValue('bookings', 'cancellationReason', 'Changed plans'),
            cancellationReasonBinding: null as string | null,
            ownerNote: encryptFieldValue('bookings', 'ownerNote', 'Morning preferred'),
            ownerNoteBinding: null as string | null,
        }],
        [secondId, { ...scope,
            comment: null as ReturnType<typeof encryptFieldValue> | null,
            commentBinding: null as string | null,
            cancellationReason: null as ReturnType<typeof encryptFieldValue> | null,
            cancellationReasonBinding: null as string | null,
            ownerNote: null as ReturnType<typeof encryptFieldValue> | null,
            ownerNoteBinding: null as string | null,
        }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "booking_text_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "booking_text_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "clientId"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params.at(-1))
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "bookings" SET "commentBinding"')) {
            const id = String(params[3])
            const current = rows.get(id)
            if (failCompare || !current || current.clientId !== params[4] || current.cabinetId !== params[5]
                || current.serviceId !== params[6]
                || JSON.stringify(current.comment) !== JSON.stringify(params[7]) || current.commentBinding !== params[8]
                || JSON.stringify(current.cancellationReason) !== JSON.stringify(params[9]) || current.cancellationReasonBinding !== params[10]
                || JSON.stringify(current.ownerNote) !== JSON.stringify(params[11]) || current.ownerNoteBinding !== params[12]) return [[], 0]
            rows.set(id, { ...current, commentBinding: params[0] as string | null,
                cancellationReasonBinding: params[1] as string | null, ownerNoteBinding: params[2] as string | null })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "booking_text_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, rows, checkpoint: () => checkpoint, failNextCompare: () => { failCompare = true } }
}

describe('booking text binding backfill', () => {
    it('resumes, verifies every field and rejects changed owner scope', async () => {
        const fake = fakeSource()
        expect(await runBookingTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.commentBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.cancellationReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.ownerNoteBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runBookingTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect((await verifyBookingTextBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(firstId, { ...fake.rows.get(firstId)!, clientId: secondId })
        await expect(verifyBookingTextBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetBookingTextBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance a checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runBookingTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Booking text binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
