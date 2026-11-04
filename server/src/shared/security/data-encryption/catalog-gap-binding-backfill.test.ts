import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetCatalogGapBindingBackfill, runCatalogGapBindingBackfill, verifyCatalogGapBindings } from './catalog-gap-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const requestedById = '00000000-0000-4000-8000-000000000002'
const providerId = '00000000-0000-4000-8000-000000000003'
const table = 'autocare_catalog_gap_requests'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'catalog-gap-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 69),
    getKey: () => ({ kek: Buffer.alloc(32, 70) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        requestedById, providerId, proposedSlug: 'brakes', categorySlug: 'repair', priceType: 'fixed',
        labels: encryptFieldValue(table, 'labels', { en: 'Brakes' }), labelsBinding: null as string | null,
        comparisonAttributes: encryptFieldValue(table, 'comparisonAttributes', ['duration']), comparisonAttributesBinding: null as string | null,
        rationale: encryptFieldValue(table, 'rationale', 'Customer need'), rationaleBinding: null as string | null,
        reviewReason: encryptFieldValue(table, 'reviewReason', 'Approved'), reviewReasonBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "catalog_gap_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "catalog_gap_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "requestedById"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_catalog_gap_requests" SET "labelsBinding"')) {
            if (conflict || params[4] !== id || params[5] !== row.requestedById || params[6] !== row.providerId
                || params[7] !== row.proposedSlug || params[8] !== row.categorySlug || params[9] !== row.priceType
                || JSON.stringify(params[10]) !== JSON.stringify(row.labels) || params[11] !== row.labelsBinding
                || JSON.stringify(params[12]) !== JSON.stringify(row.comparisonAttributes) || params[13] !== row.comparisonAttributesBinding
                || JSON.stringify(params[14]) !== JSON.stringify(row.rationale) || params[15] !== row.rationaleBinding
                || JSON.stringify(params[16]) !== JSON.stringify(row.reviewReason) || params[17] !== row.reviewReasonBinding) return [[], 0]
            row.labelsBinding = params[0] as string
            row.comparisonAttributesBinding = params[1] as string
            row.rationaleBinding = params[2] as string
            row.reviewReasonBinding = params[3] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "catalog_gap_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('catalog gap binding backfill', () => {
    it('resumes, verifies and rejects a changed requester scope', async () => {
        const fake = fakeSource()
        expect(await runCatalogGapBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.labelsBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.comparisonAttributesBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.rationaleBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.reviewReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runCatalogGapBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyCatalogGapBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.requestedById = id
        await expect(verifyCatalogGapBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetCatalogGapBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runCatalogGapBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Catalog gap binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
