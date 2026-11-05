import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetBroadcastOfferBindingBackfill, runBroadcastOfferBindingBackfill, verifyBroadcastOfferBindings } from './broadcast-offer-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const broadcastRequestId = '00000000-0000-4000-8000-000000000002'
const providerId = '00000000-0000-4000-8000-000000000003'
const locationId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'broadcast-offer-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 61),
    getKey: () => ({ kek: Buffer.alloc(32, 62) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        broadcastRequestId, providerId, locationId,
        offerSnapshot: encryptFieldValue('autocare_broadcast_offers', 'offerSnapshot', { lineItems: [{ title: 'Repair' }] }),
        offerSnapshotBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "broadcast_offer_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "broadcast_offer_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "broadcastRequestId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_broadcast_offers" SET "offerSnapshotBinding"')) {
            if (conflict || params[1] !== id || params[2] !== row.broadcastRequestId || params[3] !== row.providerId
                || params[4] !== row.locationId || JSON.stringify(params[5]) !== JSON.stringify(row.offerSnapshot)
                || params[6] !== row.offerSnapshotBinding) return [[], 0]
            row.offerSnapshotBinding = params[0] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "broadcast_offer_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('broadcast offer binding backfill', () => {
    it('resumes, verifies and rejects changed provider scope', async () => {
        const fake = fakeSource()
        expect(await runBroadcastOfferBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.offerSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runBroadcastOfferBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyBroadcastOfferBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.providerId = broadcastRequestId
        await expect(verifyBroadcastOfferBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetBroadcastOfferBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runBroadcastOfferBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Broadcast offer binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
