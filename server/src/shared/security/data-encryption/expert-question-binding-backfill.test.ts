import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetExpertQuestionBindingBackfill, runExpertQuestionBindingBackfill, verifyExpertQuestionBindings } from './expert-question-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const clientId = '00000000-0000-4000-8000-000000000002'
const table = 'autocare_expert_questions'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'expert-question-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 73),
    getKey: () => ({ kek: Buffer.alloc(32, 74) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        clientId,
        vehicleSnapshot: encryptFieldValue(table, 'vehicleSnapshot', { make: 'Toyota' }), vehicleSnapshotBinding: null as string | null,
        symptoms: encryptFieldValue(table, 'symptoms', 'Private symptoms'), symptomsBinding: null as string | null,
        answer: encryptFieldValue(table, 'answer', 'Private answer'), answerBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "expert_question_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "expert_question_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "clientId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_expert_questions" SET "vehicleSnapshotBinding"')) {
            if (conflict || params[3] !== id || params[4] !== row.clientId
                || JSON.stringify(params[5]) !== JSON.stringify(row.vehicleSnapshot) || params[6] !== row.vehicleSnapshotBinding
                || params[7] !== row.symptoms || params[8] !== row.symptomsBinding
                || params[9] !== row.answer || params[10] !== row.answerBinding) return [[], 0]
            row.vehicleSnapshotBinding = params[0] as string
            row.symptomsBinding = params[1] as string
            row.answerBinding = params[2] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "expert_question_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('expert question binding backfill', () => {
    it('resumes, verifies and rejects a changed request scope', async () => {
        const fake = fakeSource()
        expect(await runExpertQuestionBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.vehicleSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.symptomsBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.answerBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runExpertQuestionBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyExpertQuestionBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.clientId = id
        await expect(verifyExpertQuestionBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetExpertQuestionBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runExpertQuestionBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Expert question binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
