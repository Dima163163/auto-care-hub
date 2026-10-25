import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { outboxPayloadEncryptionTransformer, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetOutboxBindingBackfill, runOutboxBindingBackfill, verifyOutboxBindings } from './outbox-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING

beforeEach(() => {
    setDataEncryptionKeyProviderForTests({
        activeKeyId: 'outbox-backfill-test',
        getIndexKey: () => Buffer.alloc(32, 51),
        getKey: () => ({ kek: Buffer.alloc(32, 52) }),
    })
    delete process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING
})

afterEach(() => {
    setDataEncryptionKeyProviderForTests(null)
    if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING
    else process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING = previousStrict
})

function fakeSource() {
    const rows = new Map<string, Record<string, unknown>>([
        [firstId, outboxPayloadEncryptionTransformer.to({ email: 'legacy@example.test', recipientName: 'Legacy Client' }) as Record<string, unknown>],
        [secondId, { redacted: true }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "outbox_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "outbox_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "payload"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, payload]) => ({ id, payload: JSON.parse(JSON.stringify(payload)) }))
        }
        if (sql.startsWith('UPDATE "outbox_events"')) {
            const id = String(params[1])
            const current = rows.get(id)
            if (failCompare || !current || JSON.stringify(current) !== String(params[2])) return [[], 0]
            rows.set(id, JSON.parse(String(params[0])) as Record<string, unknown>)
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "outbox_binding_backfill_checkpoints"')) {
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

describe('outbox binding backfill', () => {
    it('resumes from a durable keyset checkpoint and verifies every bound recipient', async () => {
        const fake = fakeSource()
        const first = await runOutboxBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })
        expect(first.exhausted).toBe(false)
        expect(first.checkpoint).toEqual({ afterId: firstId, processed: 1 })
        expect(fake.rows.get(firstId)).toHaveProperty('$recordId', firstId)
        expect(fake.rows.get(firstId)).toHaveProperty('emailCiphertext.recordBinding')
        expect(fake.rows.get(firstId)).toHaveProperty('recipientNameCiphertext.recordBinding')

        const resumed = await runOutboxBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 })
        expect(resumed.exhausted).toBe(true)
        expect(resumed.checkpoint).toEqual({ afterId: secondId, processed: 2 })
        expect(await verifyOutboxBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { processed: 2 } })

        process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING = 'true'
        expect(outboxPayloadEncryptionTransformer.from(fake.rows.get(firstId))).toMatchObject({ email: 'legacy@example.test' })
        expect(outboxPayloadEncryptionTransformer.from(fake.rows.get(secondId))).toEqual({ redacted: true })
        fake.rows.set(secondId, fake.rows.get(firstId) as Record<string, unknown>)
        await expect(verifyOutboxBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted outbox record binding authentication failed.')
        await resetOutboxBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a concurrent source update', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runOutboxBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Outbox binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })

    it('rejects legacy recipients in strict mode before cutover', () => {
        const fake = fakeSource()
        process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING = 'true'
        expect(() => outboxPayloadEncryptionTransformer.from(fake.rows.get(firstId)))
            .toThrow('Encrypted outbox record binding is missing.')
    })
})
