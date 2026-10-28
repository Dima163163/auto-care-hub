import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetAutoCareRescheduleTextBindingBackfill, runAutoCareRescheduleTextBindingBackfill, verifyAutoCareRescheduleTextBindings } from './autocare-reschedule-text-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const requestId = '00000000-0000-4000-8000-000000000002'
const requesterId = '00000000-0000-4000-8000-000000000003'
const resolverId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'autocare-reschedule-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 59),
    getKey: () => ({ kek: Buffer.alloc(32, 60) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        requestId, requestedById: requesterId, resolvedById: resolverId, status: 'rejected',
        reason: encryptFieldValue('autocare_reschedule_requests', 'reason', 'Service proposed a new slot'),
        reasonBinding: null as string | null,
        resolutionReason: encryptFieldValue('autocare_reschedule_requests', 'resolutionReason', 'Client declined'),
        resolutionReasonBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "autocare_reschedule_text_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "autocare_reschedule_text_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "requestId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_reschedule_requests" SET "reasonBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.requestId || params[4] !== row.requestedById
                || params[5] !== row.resolvedById || params[6] !== row.status
                || JSON.stringify(params[7]) !== JSON.stringify(row.reason) || params[8] !== row.reasonBinding
                || JSON.stringify(params[9]) !== JSON.stringify(row.resolutionReason)
                || params[10] !== row.resolutionReasonBinding) return [[], 0]
            row.reasonBinding = params[0] as string
            row.resolutionReasonBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "autocare_reschedule_text_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('AutoCare reschedule text binding backfill', () => {
    it('resumes, verifies both fields and rejects a changed resolver', async () => {
        const fake = fakeSource()
        expect(await runAutoCareRescheduleTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.reasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.resolutionReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runAutoCareRescheduleTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyAutoCareRescheduleTextBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.resolvedById = requesterId
        await expect(verifyAutoCareRescheduleTextBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetAutoCareRescheduleTextBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runAutoCareRescheduleTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('AutoCare reschedule text binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
