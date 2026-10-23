import { afterEach, describe, expect, it } from 'vitest'

import {
    createBlindIndex,
    createBlindIndexTransformer,
    createEncryptedFieldTransformer,
    setDataEncryptionKeyProviderForTests,
} from './field-encryption.js'

const provider = {
    activeKeyId: 'test-key',
    getIndexKey: () => Buffer.alloc(32, 29),
    getKey: () => ({ kek: Buffer.alloc(32, 41) }),
}

afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('encrypted evidence reference lookup', () => {
    it('keeps encrypted bytes random but generates a stable domain-bound lookup key', () => {
        setDataEncryptionKeyProviderForTests(provider)
        const value = 'private://providers/docs/license.pdf'
        const encrypted = createEncryptedFieldTransformer('autocare_trust_evidence', 'reference', 'text')
        const index = createBlindIndexTransformer('evidence-reference')
        expect(encrypted.to(value)).not.toBe(encrypted.to(value))
        expect(index.to(value)).toBe(index.to(value))
        expect(index.to(value)).toBe(createBlindIndex(value, 'evidence-reference'))
        expect(index.to(value)).not.toBe(createBlindIndex(value, 'email'))
    })

    it('supports the full validated private reference length', () => {
        setDataEncryptionKeyProviderForTests(provider)
        expect(createBlindIndex('x'.repeat(500), 'evidence-reference')).toMatch(/^h1_/)
        expect(() => createBlindIndex('x'.repeat(501), 'evidence-reference')).toThrow()
    })
})
