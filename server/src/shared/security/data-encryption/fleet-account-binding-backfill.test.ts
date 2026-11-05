import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetFleetAccountBindingBackfill, runFleetAccountBindingBackfill, verifyFleetAccountBindings } from './fleet-account-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const ownerId = '00000000-0000-4000-8000-000000000002'
const table = 'autocare_fleet_accounts'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'fleet-account-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 73),
    getKey: () => ({ kek: Buffer.alloc(32, 74) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        ownerId,
        name: encryptFieldValue(table, 'name', 'Private fleet'), nameBinding: null as string | null,
        notes: encryptFieldValue(table, 'notes', 'Private notes'), notesBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "fleet_account_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "fleet_account_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "ownerId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_fleet_accounts" SET "nameBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.ownerId
                || params[4] !== row.name || params[5] !== row.nameBinding
                || params[6] !== row.notes || params[7] !== row.notesBinding) return [[], 0]
            row.nameBinding = params[0] as string
            row.notesBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "fleet_account_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('fleet account binding backfill', () => {
    it('resumes, verifies and rejects a changed request scope', async () => {
        const fake = fakeSource()
        expect(await runFleetAccountBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.nameBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.notesBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runFleetAccountBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyFleetAccountBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.ownerId = id
        await expect(verifyFleetAccountBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetFleetAccountBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runFleetAccountBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Fleet account binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
