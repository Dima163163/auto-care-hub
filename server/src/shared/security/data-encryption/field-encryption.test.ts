import { beforeEach, describe, expect, it } from 'vitest'
import {
    createEmailBlindIndex,
    createEncryptedFieldTransformer,
    decryptFieldValue,
    decryptRecordBoundFieldValue,
    encryptFieldValue,
    encryptRecordBoundFieldValue,
    isEncryptedFieldEnvelope,
    outboxPayloadEncryptionTransformer,
    setDataEncryptionKeyProviderForTests,
} from './field-encryption.js'

const testKey = Buffer.alloc(32, 19)

beforeEach(() => {
    setDataEncryptionKeyProviderForTests({
        activeKeyId: 'test-key-v1',
        getIndexKey: () => Buffer.alloc(32, 73),
        getKey(keyId) {
            if (keyId !== 'test-key-v1') throw new Error('unknown test key')
            return { kek: testKey }
        },
    })
})

describe('field encryption', () => {
    it('encrypts with random data keys and decrypts authenticated payloads', () => {
        const first = encryptFieldValue('users', 'phone', '+79990000000')
        const second = encryptFieldValue('users', 'phone', '+79990000000')

        expect(first.ciphertext).not.toBe(second.ciphertext)
        expect(decryptFieldValue('users', 'phone', first)).toBe('+79990000000')
        expect(() => decryptFieldValue('users', 'name', first)).toThrow('Encrypted field authentication failed.')
        expect(isEncryptedFieldEnvelope(first)).toBe(true)
    })

    it('rejects unauthenticated ciphertext instead of returning partial plaintext', () => {
        const envelope = encryptFieldValue('chat', 'body', { text: 'private message' })
        const tampered = { ...envelope, tag: Buffer.alloc(16, 0).toString('base64url') }
        expect(() => decryptFieldValue('chat', 'body', tampered)).toThrow('Encrypted field authentication failed.')
        expect(() => decryptFieldValue('chat', 'body', 'legacy plaintext')).toThrow('Encrypted field is not migrated or is invalid.')
    })

    it('binds a compatible envelope to its record and rejects tampering', () => {
        const scope = { rowId: '9c02f302-02bb-4e17-a7de-46c8cf6ea482', ownerId: '4314975e-9dfc-4ca4-94c6-a8c45a210a28' }
        const envelope = encryptRecordBoundFieldValue('autocare_provider_invitations', 'email', 'staff@example.test', scope)
        expect(decryptRecordBoundFieldValue('autocare_provider_invitations', 'email', envelope, scope))
            .toBe('staff@example.test')
        expect(decryptFieldValue('autocare_provider_invitations', 'email', envelope)).toBe('staff@example.test')
        expect(() => decryptRecordBoundFieldValue('autocare_provider_invitations', 'email', envelope, {
            ...scope, rowId: '066036ad-1e66-40c6-bc90-3d6021ced9ea',
        })).toThrow('Encrypted record binding authentication failed.')
        expect(() => decryptRecordBoundFieldValue('autocare_provider_invitations', 'email', envelope, {
            ...scope, ownerId: '066036ad-1e66-40c6-bc90-3d6021ced9ea',
        })).toThrow('Encrypted record binding authentication failed.')
        expect(() => decryptRecordBoundFieldValue('autocare_provider_invitations', 'email', {
            ...envelope, recordBinding: 'r1_invalid',
        }, scope)).toThrow('Encrypted record binding is invalid.')

        const legacy = encryptFieldValue('autocare_provider_invitations', 'email', 'staff@example.test')
        expect(() => decryptRecordBoundFieldValue('autocare_provider_invitations', 'email', legacy, scope))
            .toThrow('Encrypted record binding is missing.')
        expect(decryptRecordBoundFieldValue('autocare_provider_invitations', 'email', legacy, scope, { allowLegacy: true }))
            .toBe('staff@example.test')
    })

    it('keeps email lookup deterministic without storing the email in the index', () => {
        const index = createEmailBlindIndex('  USER@Example.com ')
        expect(index).toBe(createEmailBlindIndex('user@example.COM'))
        expect(index).not.toContain('user')
        expect(index).not.toBe(createEmailBlindIndex('other@example.com'))
    })

    it('serializes text envelopes and round-trips private outbox recipients', () => {
        const transformer = createEncryptedFieldTransformer('users', 'name', 'text')
        const storedName = transformer.to('Private Name')
        expect(typeof storedName).toBe('string')
        expect(storedName).not.toContain('Private Name')
        expect(transformer.from(storedName)).toBe('Private Name')

        const payload = { toEmail: 'client@example.test', recipientName: 'Private Client', userId: 'user-1' }
        const storedPayload = outboxPayloadEncryptionTransformer.to(payload) as Record<string, unknown>
        expect(JSON.stringify(storedPayload)).not.toContain('client@example.test')
        expect(JSON.stringify(storedPayload)).not.toContain('Private Client')
        expect(storedPayload.toEmail).toBe(createEmailBlindIndex('client@example.test'))
        expect(outboxPayloadEncryptionTransformer.from(storedPayload)).toEqual(payload)
        expect(outboxPayloadEncryptionTransformer.from(Object.fromEntries(Object.entries(storedPayload).reverse())))
            .toEqual(payload)

        const swappedIndex = { ...storedPayload, toEmail: createEmailBlindIndex('other@example.test') }
        expect(() => outboxPayloadEncryptionTransformer.from(swappedIndex))
            .toThrow('Encrypted outbox email index authentication failed.')
        const missingIndex = { ...storedPayload, toEmail: null }
        expect(() => outboxPayloadEncryptionTransformer.from(missingIndex))
            .toThrow('Encrypted outbox email index is invalid.')
        const absentIndex = { ...storedPayload }
        Reflect.deleteProperty(absentIndex, 'toEmail')
        expect(() => outboxPayloadEncryptionTransformer.from(absentIndex))
            .toThrow('Encrypted outbox email index is invalid.')
        const missingCiphertext = { ...storedPayload }
        Reflect.deleteProperty(missingCiphertext, 'toEmailCiphertext')
        expect(() => outboxPayloadEncryptionTransformer.from(missingCiphertext))
            .toThrow('Encrypted outbox email ciphertext is missing.')
    })
})
