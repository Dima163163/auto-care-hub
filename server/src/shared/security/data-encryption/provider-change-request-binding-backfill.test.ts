import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetProviderChangeRequestBindingBackfill, runProviderChangeRequestBindingBackfill, verifyProviderChangeRequestBindings } from './provider-change-request-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const providerId = '00000000-0000-4000-8000-000000000002'
const requestedById = '00000000-0000-4000-8000-000000000003'
const table = 'autocare_provider_change_requests'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'provider-change-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 61),
    getKey: () => ({ kek: Buffer.alloc(32, 62) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        providerId,
        requestedById,
        kind: 'verification',
        payload: encryptFieldValue(table, 'payload', { documents: [] }),
        payloadBinding: null as string | null,
        reviewReason: encryptFieldValue(table, 'reviewReason', 'Approved'),
        reviewReasonBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "provider_change_request_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "provider_change_request_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "providerId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_provider_change_requests" SET "payloadBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.providerId || params[4] !== row.requestedById
                || params[5] !== row.kind || JSON.stringify(params[6]) !== JSON.stringify(row.payload)
                || params[7] !== row.payloadBinding || JSON.stringify(params[8]) !== JSON.stringify(row.reviewReason)
                || params[9] !== row.reviewReasonBinding) return [[], 0]
            row.payloadBinding = params[0] as string
            row.reviewReasonBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "provider_change_request_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('provider change request binding backfill', () => {
    it('resumes, verifies and rejects a changed provider scope', async () => {
        const fake = fakeSource()
        expect(await runProviderChangeRequestBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.payloadBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.reviewReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runProviderChangeRequestBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyProviderChangeRequestBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.providerId = id
        await expect(verifyProviderChangeRequestBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetProviderChangeRequestBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runProviderChangeRequestBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Provider change request binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
