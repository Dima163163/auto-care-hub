import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetGuaranteeClaimBindingBackfill, runGuaranteeClaimBindingBackfill, verifyGuaranteeClaimBindings } from './guarantee-claim-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const requestId = '00000000-0000-4000-8000-000000000002'
const clientId = '00000000-0000-4000-8000-000000000003'
const providerId = '00000000-0000-4000-8000-000000000004'
const table = 'autocare_guarantee_claims'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'guarantee-claim-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 73),
    getKey: () => ({ kek: Buffer.alloc(32, 74) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        requestId, clientId, providerId, claimType: 'quality',
        summary: encryptFieldValue(table, 'summary', 'Repair complete'), summaryBinding: null as string | null,
        resolution: encryptFieldValue(table, 'resolution', 'Replaced brakes'), resolutionBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "guarantee_claim_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "guarantee_claim_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "requestId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_guarantee_claims" SET "summaryBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.requestId || params[4] !== row.clientId
                || params[5] !== row.providerId || params[6] !== row.claimType
                || params[7] !== row.summary || params[8] !== row.summaryBinding
                || params[9] !== row.resolution || params[10] !== row.resolutionBinding) return [[], 0]
            row.summaryBinding = params[0] as string
            row.resolutionBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "guarantee_claim_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('guarantee claim binding backfill', () => {
    it('resumes, verifies and rejects a changed request scope', async () => {
        const fake = fakeSource()
        expect(await runGuaranteeClaimBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.summaryBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.resolutionBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runGuaranteeClaimBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyGuaranteeClaimBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.clientId = id
        await expect(verifyGuaranteeClaimBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetGuaranteeClaimBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runGuaranteeClaimBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Guarantee claim binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
