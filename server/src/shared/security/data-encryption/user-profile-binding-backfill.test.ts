import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetUserProfileBindingBackfill, runUserProfileBindingBackfill, verifyUserProfileBindings } from './user-profile-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'user-profile-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 51),
    getKey: () => ({ kek: Buffer.alloc(32, 52) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { name: JSON.stringify(encryptFieldValue('users', 'name', 'First Name')),
            phone: JSON.stringify(encryptFieldValue('users', 'phone', '+79991111111')),
            nameBinding: null as string | null, phoneBinding: null as string | null }],
        [secondId, { name: JSON.stringify(encryptFieldValue('users', 'name', 'Second Name')),
            phone: null as string | null, nameBinding: null as string | null, phoneBinding: null as string | null }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "user_profile_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "user_profile_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "name"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "users" SET "nameBinding"')) {
            const id = String(params[2])
            const current = rows.get(id)
            if (failCompare || !current || current.name !== params[3] || current.phone !== params[4]
                || current.nameBinding !== params[5] || current.phoneBinding !== params[6]) return [[], 0]
            rows.set(id, { ...current, nameBinding: String(params[0]), phoneBinding: params[1] as string | null })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "user_profile_binding_backfill_checkpoints"')) {
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

describe('user profile binding backfill', () => {
    it('resumes and verifies non-null name and optional phone', async () => {
        const fake = fakeSource()
        const first = await runUserProfileBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })
        expect(first).toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.nameBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.phoneBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        const resumed = await runUserProfileBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 })
        expect(resumed).toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.nameBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(secondId)?.phoneBinding).toBeNull()
        expect(await verifyUserProfileBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { processed: 2 } })
        fake.rows.set(secondId, { ...fake.rows.get(secondId)!, name: fake.rows.get(firstId)!.name })
        await expect(verifyUserProfileBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetUserProfileBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runUserProfileBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('User profile binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
