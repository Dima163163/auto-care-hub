import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetServiceRequestNoteBindingBackfill, runServiceRequestNoteBindingBackfill, verifyServiceRequestNoteBindings } from './service-request-note-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'service-request-note-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 51),
    getKey: () => ({ kek: Buffer.alloc(32, 52) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { note: encryptFieldValue('autocare_service_requests', 'note', 'Секретное примечание клиента'),
            noteBinding: null as string | null, clientId: firstId, providerId: secondId, locationId: firstId, definitionId: secondId }],
        [secondId, { note: null as ReturnType<typeof encryptFieldValue> | null, noteBinding: null as string | null,
            clientId: firstId, providerId: secondId, locationId: firstId, definitionId: secondId }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "service_request_note_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "service_request_note_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "note"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "autocare_service_requests" SET "noteBinding"')) {
            const id = String(params[1])
            const current = rows.get(id)
            if (failCompare || !current || JSON.stringify(current.note) !== JSON.stringify(params[2]) || current.noteBinding !== params[3]
                || current.clientId !== params[4] || current.providerId !== params[5] || current.locationId !== params[6]
                || current.definitionId !== params[7]) return [[], 0]
            rows.set(id, { ...current, noteBinding: String(params[0]) })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "service_request_note_binding_backfill_checkpoints"')) {
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

describe('service request note binding backfill', () => {
    it('resumes, verifies a private service request note and accepts a null service request note', async () => {
        const fake = fakeSource()
        expect(await runServiceRequestNoteBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.noteBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runServiceRequestNoteBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.noteBinding).toBeNull()
        expect((await verifyServiceRequestNoteBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(secondId, { ...fake.rows.get(secondId)!, noteBinding: fake.rows.get(firstId)!.noteBinding })
        await expect(verifyServiceRequestNoteBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted autocare_service_requests.note record binding is invalid.')
        await resetServiceRequestNoteBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runServiceRequestNoteBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Service request note binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
