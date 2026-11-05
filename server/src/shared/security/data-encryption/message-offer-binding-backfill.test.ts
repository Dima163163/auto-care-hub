import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetMessageOfferBindingBackfill, runMessageOfferBindingBackfill, verifyMessageOfferBindings } from './message-offer-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'message-offer-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 51),
    getKey: () => ({ kek: Buffer.alloc(32, 52) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { offer: encryptFieldValue('autocare_service_messages', 'offer', { type: 'discount', title: 'Private offer', status: 'pending' }),
            offerBinding: null as string | null, requestId: null as string | null, threadId: firstId, senderId: secondId, kind: 'text' }],
        [secondId, { offer: null as ReturnType<typeof encryptFieldValue> | null, offerBinding: null as string | null,
            requestId: null as string | null, threadId: firstId, senderId: secondId, kind: 'text' }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "message_offer_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "message_offer_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "offer"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "autocare_service_messages" SET "offerBinding"')) {
            const id = String(params[1])
            const current = rows.get(id)
            if (failCompare || !current || JSON.stringify(current.offer) !== JSON.stringify(params[2]) || current.offerBinding !== params[3]
                || current.requestId !== params[4] || current.threadId !== params[5] || current.senderId !== params[6]
                || current.kind !== params[7]) return [[], 0]
            rows.set(id, { ...current, offerBinding: String(params[0]) })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "message_offer_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = {
        query,
        transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }),
    } as unknown as DataSource
    return { source, rows, checkpoint: () => checkpoint, failNextCompare: () => { failCompare = true } }
}

describe('message offer binding backfill', () => {
    it('resumes, verifies a private message and accepts a null offer', async () => {
        const fake = fakeSource()
        expect(await runMessageOfferBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.offerBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runMessageOfferBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.offerBinding).toBeNull()
        expect((await verifyMessageOfferBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(secondId, { ...fake.rows.get(secondId)!, offerBinding: fake.rows.get(firstId)!.offerBinding })
        await expect(verifyMessageOfferBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted autocare_service_messages.offer record binding is invalid.')
        await resetMessageOfferBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runMessageOfferBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Message offer binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
