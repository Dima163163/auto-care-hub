import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetChatSubjectBindingBackfill, runChatSubjectBindingBackfill, verifyChatSubjectBindings } from './chat-subject-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'chat-subject-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 51),
    getKey: () => ({ kek: Buffer.alloc(32, 52) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { subject: JSON.stringify(encryptFieldValue('autocare_chat_threads', 'subject', 'Private message')),
            subjectBinding: null as string | null, type: 'support', requestId: null as string | null, providerId: null as string | null, clientId: firstId, createdById: secondId }],
        [secondId, { subject: JSON.stringify(encryptFieldValue('autocare_chat_threads', 'subject', 'Second subject')), subjectBinding: null as string | null,
            type: 'support', requestId: null as string | null, providerId: null as string | null, clientId: firstId, createdById: secondId }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "chat_subject_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "chat_subject_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "subject"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "autocare_chat_threads" SET "subjectBinding"')) {
            const id = String(params[1])
            const current = rows.get(id)
            if (failCompare || !current || current.subject !== params[2] || current.subjectBinding !== params[3]
                || current.type !== params[4] || current.requestId !== params[5] || current.providerId !== params[6]
                || current.clientId !== params[7] || current.createdById !== params[8]) return [[], 0]
            rows.set(id, { ...current, subjectBinding: String(params[0]) })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "chat_subject_binding_backfill_checkpoints"')) {
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

describe('chat subject binding backfill', () => {
    it('resumes, verifies private subjects and rejects a swapped pair', async () => {
        const fake = fakeSource()
        expect(await runChatSubjectBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.subjectBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runChatSubjectBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.subjectBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await verifyChatSubjectBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(secondId, { ...fake.rows.get(secondId)!, subject: fake.rows.get(firstId)!.subject,
            subjectBinding: fake.rows.get(firstId)!.subjectBinding })
        await expect(verifyChatSubjectBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetChatSubjectBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runChatSubjectBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Chat subject binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
