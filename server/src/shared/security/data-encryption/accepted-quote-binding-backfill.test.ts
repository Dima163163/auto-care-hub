import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetAcceptedQuoteBindingBackfill, runAcceptedQuoteBindingBackfill, verifyAcceptedQuoteBindings } from './accepted-quote-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'accepted-quote-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 51),
    getKey: () => ({ kek: Buffer.alloc(32, 52) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { acceptedQuoteSnapshot: encryptFieldValue('autocare_service_requests', 'acceptedQuoteSnapshot', { amountMinor: 290_000, currencyCode: 'RUB' }),
            acceptedQuoteSnapshotBinding: null as string | null, clientId: firstId, providerId: secondId, locationId: firstId, definitionId: secondId }],
        [secondId, { acceptedQuoteSnapshot: null as ReturnType<typeof encryptFieldValue> | null, acceptedQuoteSnapshotBinding: null as string | null,
            clientId: firstId, providerId: secondId, locationId: firstId, definitionId: secondId }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "accepted_quote_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "accepted_quote_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "acceptedQuoteSnapshot"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "autocare_service_requests" SET "acceptedQuoteSnapshotBinding"')) {
            const id = String(params[1])
            const current = rows.get(id)
            if (failCompare || !current || JSON.stringify(current.acceptedQuoteSnapshot) !== JSON.stringify(params[2]) || current.acceptedQuoteSnapshotBinding !== params[3]
                || current.clientId !== params[4] || current.providerId !== params[5] || current.locationId !== params[6]
                || current.definitionId !== params[7]) return [[], 0]
            rows.set(id, { ...current, acceptedQuoteSnapshotBinding: String(params[0]) })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "accepted_quote_binding_backfill_checkpoints"')) {
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

describe('accepted quote binding backfill', () => {
    it('resumes, verifies a private accepted quote and accepts a null accepted quote', async () => {
        const fake = fakeSource()
        expect(await runAcceptedQuoteBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.acceptedQuoteSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runAcceptedQuoteBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.acceptedQuoteSnapshotBinding).toBeNull()
        expect((await verifyAcceptedQuoteBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(secondId, { ...fake.rows.get(secondId)!, acceptedQuoteSnapshotBinding: fake.rows.get(firstId)!.acceptedQuoteSnapshotBinding })
        await expect(verifyAcceptedQuoteBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted autocare_service_requests.acceptedQuoteSnapshot record binding is invalid.')
        await resetAcceptedQuoteBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runAcceptedQuoteBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Accepted quote binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
