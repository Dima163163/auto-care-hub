import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetAppealBindingBackfill, runAppealBindingBackfill, verifyAppealBindings } from './appeal-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const subjectId = '00000000-0000-4000-8000-000000000002'
const submittedById = '00000000-0000-4000-8000-000000000003'
const providerId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'appeal-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 65),
    getKey: () => ({ kek: Buffer.alloc(32, 66) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        subject: 'provider', subjectId, submittedById, providerId,
        reason: encryptFieldValue('autocare_appeals', 'reason', 'Please review'),
        reasonBinding: null as string | null,
        decisionReason: encryptFieldValue('autocare_appeals', 'decisionReason', 'Approved'),
        decisionReasonBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "appeal_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "appeal_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "subject"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_appeals" SET "reasonBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.subject || params[4] !== row.subjectId
                || params[5] !== row.submittedById || params[6] !== row.providerId
                || JSON.stringify(params[7]) !== JSON.stringify(row.reason)
                || params[8] !== row.reasonBinding || JSON.stringify(params[9]) !== JSON.stringify(row.decisionReason)
                || params[10] !== row.decisionReasonBinding) return [[], 0]
            row.reasonBinding = params[0] as string
            row.decisionReasonBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "appeal_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('appeal binding backfill', () => {
    it('resumes, verifies and rejects a changed subject scope', async () => {
        const fake = fakeSource()
        expect(await runAppealBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.reasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.decisionReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runAppealBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyAppealBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.subjectId = id
        await expect(verifyAppealBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetAppealBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runAppealBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Appeal binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
