import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetUserSecondaryBindingBackfill, runUserSecondaryBindingBackfill, verifyUserSecondaryBindings } from './user-secondary-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'user-secondary-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 61),
    getKey: () => ({ kek: Buffer.alloc(32, 62) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

type Row = {
    avatarUrl: unknown | null
    avatarUrlBinding: string | null
    communityDisplayName: unknown | null
    communityDisplayNameBinding: string | null
    preferredCity: unknown | null
    preferredCityBinding: string | null
}

function fakeSource() {
    const rows = new Map<string, Row>([
        [firstId, {
            avatarUrl: encryptFieldValue('users', 'avatarUrl', '/private.png'), avatarUrlBinding: null,
            communityDisplayName: encryptFieldValue('users', 'communityDisplayName', 'Client'), communityDisplayNameBinding: null,
            preferredCity: encryptFieldValue('users', 'preferredCity', 'Самара'), preferredCityBinding: null,
        }],
        [secondId, {
            avatarUrl: null, avatarUrlBinding: null, communityDisplayName: null, communityDisplayNameBinding: null,
            preferredCity: null, preferredCityBinding: null,
        }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "user_secondary_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "user_secondary_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "avatarUrl"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "users" SET "avatarUrlBinding"')) {
            const id = String(params[3])
            const current = rows.get(id)
            if (failCompare || !current
                || JSON.stringify(current.avatarUrl) !== JSON.stringify(params[4]) || current.avatarUrlBinding !== params[5]
                || JSON.stringify(current.communityDisplayName) !== JSON.stringify(params[6]) || current.communityDisplayNameBinding !== params[7]
                || JSON.stringify(current.preferredCity) !== JSON.stringify(params[8]) || current.preferredCityBinding !== params[9]) return [[], 0]
            rows.set(id, { ...current,
                avatarUrlBinding: params[0] as string | null,
                communityDisplayNameBinding: params[1] as string | null,
                preferredCityBinding: params[2] as string | null,
            })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "user_secondary_binding_backfill_checkpoints"')) {
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

describe('user secondary binding backfill', () => {
    it('resumes, verifies nullable fields and rejects a copied encrypted value', async () => {
        const fake = fakeSource()
        expect(await runUserSecondaryBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.avatarUrlBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.communityDisplayNameBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.preferredCityBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(await runUserSecondaryBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.avatarUrlBinding).toBeNull()
        expect((await verifyUserSecondaryBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(secondId, { ...fake.rows.get(secondId)!,
            preferredCity: fake.rows.get(firstId)!.preferredCity,
            preferredCityBinding: fake.rows.get(firstId)!.preferredCityBinding,
        })
        await expect(verifyUserSecondaryBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetUserSecondaryBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runUserSecondaryBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('User secondary binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
