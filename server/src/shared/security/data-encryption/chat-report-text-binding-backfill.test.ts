import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetChatReportTextBindingBackfill, runChatReportTextBindingBackfill, verifyChatReportTextBindings } from './chat-report-text-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const threadId = '00000000-0000-4000-8000-000000000002'
const reporterId = '00000000-0000-4000-8000-000000000003'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'chat-report-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 65),
    getKey: () => ({ kek: Buffer.alloc(32, 66) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        threadId, reporterId,
        description: encryptFieldValue('autocare_chat_reports', 'description', 'Unsafe message'),
        descriptionBinding: null as string | null,
        resolutionReason: encryptFieldValue('autocare_chat_reports', 'resolutionReason', 'Case closed'),
        resolutionReasonBinding: null as string | null,
        assignmentReason: encryptFieldValue('autocare_chat_reports', 'assignmentReason', 'Review required'),
        assignmentReasonBinding: null as string | null,
        extensionReason: encryptFieldValue('autocare_chat_reports', 'extensionReason', 'Need more time'),
        extensionReasonBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "chat_report_text_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "chat_report_text_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "threadId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_chat_reports" SET "descriptionBinding"')) {
            if (conflict || params[4] !== id || params[5] !== row.threadId || params[6] !== row.reporterId
                || JSON.stringify(params[7]) !== JSON.stringify(row.description) || params[8] !== row.descriptionBinding
                || JSON.stringify(params[9]) !== JSON.stringify(row.resolutionReason) || params[10] !== row.resolutionReasonBinding
                || JSON.stringify(params[11]) !== JSON.stringify(row.assignmentReason) || params[12] !== row.assignmentReasonBinding
                || JSON.stringify(params[13]) !== JSON.stringify(row.extensionReason) || params[14] !== row.extensionReasonBinding) return [[], 0]
            row.descriptionBinding = params[0] as string
            row.resolutionReasonBinding = params[1] as string
            row.assignmentReasonBinding = params[2] as string
            row.extensionReasonBinding = params[3] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "chat_report_text_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('chat report text binding backfill', () => {
    it('resumes, verifies four fields and rejects changed reporter scope', async () => {
        const fake = fakeSource()
        expect(await runChatReportTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        for (const binding of ['descriptionBinding', 'resolutionReasonBinding', 'assignmentReasonBinding', 'extensionReasonBinding'] as const) {
            expect(fake.row[binding]).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        }
        expect((await runChatReportTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyChatReportTextBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.reporterId = threadId
        await expect(verifyChatReportTextBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetChatReportTextBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runChatReportTextBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Chat report text binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
