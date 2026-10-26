import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlindIndex, encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetOAuthBindingBackfill, runOAuthBindingBackfill, verifyOAuthBindings } from './oauth-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const userId = '00000000-0000-4000-8000-000000000003'

beforeEach(() => {
    setDataEncryptionKeyProviderForTests({
        activeKeyId: 'oauth-backfill-test',
        getIndexKey: () => Buffer.alloc(32, 51),
        getKey: () => ({ kek: Buffer.alloc(32, 52) }),
    })
})
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = (subject: string) => ({
        provider: 'google', userId,
        providerSubject: createBlindIndex(subject, 'oauth-provider-subject'),
        providerSubjectCiphertext: JSON.stringify(encryptFieldValue('oauth_identities', 'providerSubject', subject)),
    })
    const rows = new Map([[firstId, row('legacy-one')], [secondId, row('legacy-two')]])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "oauth_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "oauth_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "provider"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "oauth_identities"')) {
            const id = String(params[1])
            const current = rows.get(id)
            if (failCompare || !current || current.provider !== params[2] || current.userId !== params[3]
                || current.providerSubject !== params[4] || current.providerSubjectCiphertext !== params[5]) return [[], 0]
            rows.set(id, { ...current, providerSubjectCiphertext: String(params[0]) })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "oauth_binding_backfill_checkpoints"')) {
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

describe('OAuth binding backfill', () => {
    it('resumes from a checkpoint and verifies every old subject', async () => {
        const fake = fakeSource()
        const first = await runOAuthBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })
        expect(first).toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        const resumed = await runOAuthBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 })
        expect(resumed).toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(JSON.parse(fake.rows.get(firstId)?.providerSubjectCiphertext ?? '')).toHaveProperty('recordBinding')
        expect(await verifyOAuthBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { processed: 2 } })
        fake.rows.set(secondId, { ...fake.rows.get(firstId)! })
        await expect(verifyOAuthBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetOAuthBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a concurrent source change', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runOAuthBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('OAuth binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
