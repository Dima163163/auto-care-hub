import { beforeEach, describe, expect, it } from 'vitest'
import {
    createEmailBlindIndex,
    createEncryptedFieldTransformer,
    decryptFieldValue,
    encryptFieldValue,
    isEncryptedFieldEnvelope,
    outboxPayloadEncryptionTransformer,
    setDataEncryptionKeyProviderForTests,
} from './field-encryption.js'

const testKey = Buffer.alloc(32, 19)

beforeEach(() => {
    setDataEncryptionKeyProviderForTests({
        activeKeyId: 'test-key-v1',
        getKey(keyId) {
            if (keyId !== 'test-key-v1') throw new Error('unknown test key')
            return { kek: testKey, indexKey: Buffer.alloc(32, 73) }
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
    })
})
