import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetServiceRequestOutcomeBindingBackfill, runServiceRequestOutcomeBindingBackfill, verifyServiceRequestOutcomeBindings } from './service-request-outcome-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const scope = { clientId: firstId, providerId: secondId, locationId: firstId, definitionId: secondId }

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'request-outcome-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 55),
    getKey: () => ({ kek: Buffer.alloc(32, 56) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, { ...scope,
            cancellationReason: encryptFieldValue('autocare_service_requests', 'cancellationReason', 'Changed plans'),
            cancellationReasonBinding: null as string | null,
            noShowReason: encryptFieldValue('autocare_service_requests', 'noShowReason', 'Did not arrive'),
            noShowReasonBinding: null as string | null,
            completionNote: encryptFieldValue('autocare_service_requests', 'completionNote', 'Finished work'),
            completionNoteBinding: null as string | null,
        }],
        [secondId, { ...scope,
            cancellationReason: null as ReturnType<typeof encryptFieldValue> | null,
            cancellationReasonBinding: null as string | null,
            noShowReason: null as ReturnType<typeof encryptFieldValue> | null,
            noShowReasonBinding: null as string | null,
            completionNote: null as ReturnType<typeof encryptFieldValue> | null,
            completionNoteBinding: null as string | null,
        }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "service_request_outcome_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "service_request_outcome_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "clientId"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params.at(-1))
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "autocare_service_requests" SET "cancellationReasonBinding"')) {
            const id = String(params[3])
            const current = rows.get(id)
            if (failCompare || !current || current.clientId !== params[4] || current.providerId !== params[5]
                || current.locationId !== params[6] || current.definitionId !== params[7]
                || JSON.stringify(current.cancellationReason) !== JSON.stringify(params[8]) || current.cancellationReasonBinding !== params[9]
                || JSON.stringify(current.noShowReason) !== JSON.stringify(params[10]) || current.noShowReasonBinding !== params[11]
                || JSON.stringify(current.completionNote) !== JSON.stringify(params[12]) || current.completionNoteBinding !== params[13]) return [[], 0]
            rows.set(id, { ...current, cancellationReasonBinding: params[0] as string | null,
                noShowReasonBinding: params[1] as string | null, completionNoteBinding: params[2] as string | null })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "service_request_outcome_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, rows, checkpoint: () => checkpoint, failNextCompare: () => { failCompare = true } }
}

describe('service request outcome binding backfill', () => {
    it('resumes, verifies all fields and rejects changed owner scope', async () => {
        const fake = fakeSource()
        expect(await runServiceRequestOutcomeBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.cancellationReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.noShowReasonBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.completionNoteBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runServiceRequestOutcomeBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.completionNoteBinding).toBeNull()
        expect((await verifyServiceRequestOutcomeBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(firstId, { ...fake.rows.get(firstId)!, clientId: secondId })
        await expect(verifyServiceRequestOutcomeBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetServiceRequestOutcomeBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runServiceRequestOutcomeBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Service request outcome binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
