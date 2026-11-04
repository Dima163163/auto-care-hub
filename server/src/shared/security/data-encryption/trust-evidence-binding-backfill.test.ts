import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlindIndex, encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetTrustEvidenceBindingBackfill, runTrustEvidenceBindingBackfill, verifyTrustEvidenceBindings } from './trust-evidence-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const providerId = '00000000-0000-4000-8000-000000000003'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'trust-evidence-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 67),
    getKey: () => ({ kek: Buffer.alloc(32, 68) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const reference = 'review-123'
    const rows = new Map([
        [firstId, { providerId, kind: 'review',
            reference: encryptFieldValue('autocare_trust_evidence', 'reference', reference),
            referenceIndex: createBlindIndex(reference, 'evidence-reference') as string | null,
            referenceBinding: null as string | null,
            notes: encryptFieldValue('autocare_trust_evidence', 'notes', 'Pending review'),
            notesBinding: null as string | null,
        }],
        [secondId, { providerId, kind: 'review',
            reference: null as ReturnType<typeof encryptFieldValue> | null,
            referenceIndex: 'h1_stale' as string | null,
            referenceBinding: null as string | null,
            notes: null as ReturnType<typeof encryptFieldValue> | null,
            notesBinding: null as string | null,
        }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "trust_evidence_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "trust_evidence_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "providerId"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, Number(params.at(-1)))
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "autocare_trust_evidence" SET "referenceBinding"')) {
            const id = String(params[3])
            const row = rows.get(id)
            if (conflict || !row || params[4] !== row.providerId || params[5] !== row.kind
                || JSON.stringify(params[6]) !== JSON.stringify(row.reference)
                || params[7] !== row.referenceIndex || params[8] !== row.referenceBinding
                || JSON.stringify(params[9]) !== JSON.stringify(row.notes) || params[10] !== row.notesBinding) return [[], 0]
            rows.set(id, { ...row, referenceBinding: params[0] as string | null,
                notesBinding: params[1] as string | null, referenceIndex: params[2] as string | null })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "trust_evidence_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, rows, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('trust evidence binding backfill', () => {
    it('binds both fields and removes a stale index from a null reference', async () => {
        const fake = fakeSource()
        expect(await runTrustEvidenceBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.referenceBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.notesBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runTrustEvidenceBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        expect(fake.rows.get(secondId)?.referenceIndex).toBeNull()
        expect((await verifyTrustEvidenceBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(firstId, { ...fake.rows.get(firstId)!, providerId: secondId })
        await expect(verifyTrustEvidenceBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetTrustEvidenceBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runTrustEvidenceBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Trust evidence binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
