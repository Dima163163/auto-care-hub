import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetBroadcastRequestBindingBackfill, runBroadcastRequestBindingBackfill, verifyBroadcastRequestBindings } from './broadcast-request-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const clientId = '00000000-0000-4000-8000-000000000002'
const serviceDefinitionId = '00000000-0000-4000-8000-000000000003'
const marketId = '00000000-0000-4000-8000-000000000004'
const table = 'autocare_broadcast_requests'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'broadcast-request-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 77),
    getKey: () => ({ kek: Buffer.alloc(32, 78) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        clientId, serviceDefinitionId, marketId,
        issueDescription: encryptFieldValue(table, 'issueDescription', 'Brakes squeak'), issueDescriptionBinding: null as string | null,
        vehicleSnapshot: encryptFieldValue(table, 'vehicleSnapshot', { make: 'Toyota' }), vehicleSnapshotBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "broadcast_request_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "broadcast_request_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "clientId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_broadcast_requests" SET "issueDescriptionBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.clientId || params[4] !== row.serviceDefinitionId
                || params[5] !== row.marketId || params[6] !== row.issueDescription || params[7] !== row.issueDescriptionBinding
                || JSON.stringify(params[8]) !== JSON.stringify(row.vehicleSnapshot) || params[9] !== row.vehicleSnapshotBinding) return [[], 0]
            row.issueDescriptionBinding = params[0] as string
            row.vehicleSnapshotBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "broadcast_request_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('broadcast request binding backfill', () => {
    it('resumes, verifies and rejects a changed owner scope', async () => {
        const fake = fakeSource()
        expect(await runBroadcastRequestBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.issueDescriptionBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.vehicleSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runBroadcastRequestBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyBroadcastRequestBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.clientId = id
        await expect(verifyBroadcastRequestBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetBroadcastRequestBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runBroadcastRequestBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Broadcast request binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
