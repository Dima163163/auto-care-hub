import { afterEach, describe, expect, it, vi } from 'vitest'

import { IndexTrustEvidenceReferences1786440000000 } from './migrations/1786440000000-IndexTrustEvidenceReferences.js'
import { createBlindIndex, createEncryptedFieldTransformer, setDataEncryptionKeyProviderForTests } from '../shared/security/data-encryption/field-encryption.js'

const provider = {
    activeKeyId: 'test-key',
    getIndexKey: () => Buffer.alloc(32, 29),
    getKey: () => ({ kek: Buffer.alloc(32, 41) }),
}

afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('trust evidence reference index migration', () => {
    it('backfills a blind index from encrypted references without exposing plaintext in SQL', async () => {
        setDataEncryptionKeyProviderForTests(provider)
        const reference = 'private://providers/docs/license.pdf'
        const encrypted = createEncryptedFieldTransformer('autocare_trust_evidence', 'reference', 'text').to(reference)
        const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'evidence-1', reference: encrypted }])
            .mockResolvedValue([])
        await new IndexTrustEvidenceReferences1786440000000().up({ query } as never)

        expect(query).toHaveBeenCalledWith(expect.stringContaining('SET "referenceIndex" = $1'), [
            createBlindIndex(reference, 'evidence-reference'), 'evidence-1',
        ])
        expect(JSON.stringify(query.mock.calls)).not.toContain(reference)
    })
})
