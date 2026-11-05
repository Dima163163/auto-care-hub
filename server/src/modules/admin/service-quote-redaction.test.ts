import type { EntityManager } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptFieldValue, setDataEncryptionKeyProviderForTests } from '../../shared/security/data-encryption/field-encryption.js'
import { verifyPlaintextRecordBinding } from '../../shared/security/data-encryption/plaintext-record-binding.js'
import { serviceQuoteSnapshotContext } from '../../shared/security/data-encryption/service-quote-snapshot-record-binding.js'
import { redactServiceQuoteSnapshots } from './service-quote-redaction.js'

const userId = '00000000-0000-4000-8000-000000000001'
const firstId = '00000000-0000-4000-8000-000000000002'
const secondId = '00000000-0000-4000-8000-000000000003'
const requestId = '00000000-0000-4000-8000-000000000004'
const providerId = '00000000-0000-4000-8000-000000000005'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'service-quote-redaction-test',
    getIndexKey: () => Buffer.alloc(32, 63),
    getKey: () => ({ kek: Buffer.alloc(32, 64) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('service quote snapshot account redaction', () => {
    it('uses a separate encrypted value and record binding for every quote', async () => {
        const quotes = [
            { id: firstId, requestId, providerId, version: 1 },
            { id: secondId, requestId, providerId, version: 2 },
        ]
        const writes: Array<{ id: string; envelope: unknown; binding: string }> = []
        const manager = { query: async (sql: string, params: unknown[]) => {
            if (sql.startsWith('SELECT quote."id"')) return quotes.filter((quote) => quote.id > String(params[1]))
            if (sql.startsWith('UPDATE "autocare_service_quotes"')) {
                const quote = quotes.find((candidate) => candidate.id === params[2])
                if (!quote || params[3] !== quote.requestId || params[4] !== quote.providerId || params[5] !== quote.version) return [[], 0]
                writes.push({ id: quote.id, envelope: params[0], binding: String(params[1]) })
                return [[{ id: quote.id }], 1]
            }
            throw new Error(`Unexpected query: ${sql}`)
        } } as unknown as Pick<EntityManager, 'query'>
        await redactServiceQuoteSnapshots(manager, userId)
        expect(writes).toHaveLength(2)
        expect(JSON.stringify(writes[0]?.envelope)).not.toBe(JSON.stringify(writes[1]?.envelope))
        expect(writes[0]?.binding).not.toBe(writes[1]?.binding)
        for (const [index, write] of writes.entries()) {
            const quote = quotes[index]!
            expect(decryptFieldValue('autocare_service_quotes', 'snapshot', write.envelope)).toEqual({ redacted: true })
            expect(() => verifyPlaintextRecordBinding('autocare_service_quotes', 'snapshot',
                JSON.stringify({ redacted: true }), quote.id, write.binding,
                { allowLegacy: false, context: serviceQuoteSnapshotContext(quote) })).not.toThrow()
        }
    })
})
