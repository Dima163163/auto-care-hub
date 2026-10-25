import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'test',
    getIndexKey: () => Buffer.alloc(32, 73),
    getKey: () => ({ kek: Buffer.alloc(32, 19) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('plaintext record binding', () => {
    it('binds a decrypted value to its row and field', () => {
        const rowId = '9c02f302-02bb-4e17-a7de-46c8cf6ea482'
        const binding = createPlaintextRecordBinding('users', 'name', 'Private Name', rowId)
        expect(binding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(() => verifyPlaintextRecordBinding('users', 'name', 'Private Name', rowId, binding)).not.toThrow()
        expect(() => verifyPlaintextRecordBinding('users', 'phone', 'Private Name', rowId, binding))
            .toThrow('Encrypted record binding authentication failed.')
        expect(() => verifyPlaintextRecordBinding('users', 'name', 'Private Name', '066036ad-1e66-40c6-bc90-3d6021ced9ea', binding))
            .toThrow('Encrypted record binding authentication failed.')
        expect(() => verifyPlaintextRecordBinding('users', 'name', 'Other Name', rowId, binding))
            .toThrow('Encrypted record binding authentication failed.')
        expect(() => verifyPlaintextRecordBinding('users', 'name', 'Private Name', rowId, null))
            .toThrow('Encrypted record binding is missing.')
        expect(() => verifyPlaintextRecordBinding('users', 'name', 'Private Name', rowId, null, { allowLegacy: true })).not.toThrow()
    })
})
