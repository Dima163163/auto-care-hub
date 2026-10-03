import { createHmac } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let encryption: typeof import('./field-encryption.js')
let directory: string
const indexKey = Buffer.alloc(32, 73)
const keys = new Map([
    ['old-kek', Buffer.alloc(32, 19)],
    ['new-kek', Buffer.alloc(32, 29)],
])

function rotatingProvider(hmacKey = Buffer.from(indexKey)) {
    return {
        activeKeyId: 'old-kek',
        getIndexKey: () => hmacKey,
        getKey(keyId: string) {
            const kek = keys.get(keyId)
            if (!kek) throw new Error('synthetic key unavailable')
            // The legacy interface incorrectly takes this key from the active KEK.
            return { kek, indexKey: keyId === 'old-kek' ? indexKey : Buffer.alloc(32, 83) }
        },
    }
}

function writeKeyring(activeKeyId: string, previousIndexKey = indexKey) {
    writeFileSync(join(directory, 'keyring.json'), JSON.stringify({
        version: 1,
        activeKeyId,
        keys: Object.fromEntries([...keys].map(([keyId, kek]) => [keyId, {
            kek: kek.toString('base64url'),
            indexKey: (keyId === 'old-kek' ? previousIndexKey : indexKey).toString('base64url'),
        }])),
    }), { mode: 0o600 })
}

beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'autocare-index-rotation-'))
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATA_ENCRYPTION_LOCAL_KEYRING', join(directory, 'keyring.json'))
    vi.resetModules()
    encryption = await import('./field-encryption.js')
})

afterEach(() => {
    vi.unstubAllEnvs()
    rmSync(directory, { recursive: true, force: true })
})

describe('independent encryption and blind-index key lifecycles', () => {
    it('preserves email, OAuth and invitation lookup while encrypting with a rotated KEK', () => {
        const provider = rotatingProvider()
        encryption.setDataEncryptionKeyProviderForTests(provider)
        const emailIndex = encryption.createEmailBlindIndex(' User@Example.Test ')
        const oauthIndex = encryption.createBlindIndex('synthetic-oauth-subject', 'oauth-provider-subject')
        const previous = encryption.encryptFieldValue('users', 'email', 'user@example.test')

        provider.activeKeyId = 'new-kek'
        expect(encryption.createEmailBlindIndex('USER@example.test')).toBe(emailIndex)
        expect(encryption.emailBlindIndexTransformer.to('user@example.test')).toBe(emailIndex)
        expect(encryption.createBlindIndex('synthetic-oauth-subject', 'oauth-provider-subject')).toBe(oauthIndex)
        expect(encryption.decryptFieldValue('users', 'email', previous)).toBe('user@example.test')
        const current = encryption.encryptFieldValue('users', 'email', 'user@example.test')
        expect(current.keyId).toBe('new-kek')
        expect(encryption.decryptFieldValue('users', 'email', current)).toBe('user@example.test')
    })

    it('captures an immutable HMAC key for a configured provider across KEK refreshes', () => {
        const mutableIndexKey = Buffer.from(indexKey)
        const provider = rotatingProvider(mutableIndexKey)
        encryption.configureDataEncryptionKeyProvider(provider)
        const initialIndex = encryption.createEmailBlindIndex('user@example.test')
        mutableIndexKey.fill(0)
        provider.activeKeyId = 'new-kek'
        expect(encryption.createEmailBlindIndex('user@example.test')).toBe(initialIndex)
        encryption.configureDataEncryptionKeyProvider(rotatingProvider())
        expect(encryption.createEmailBlindIndex('user@example.test')).toBe(initialIndex)
    })

    it('rejects an unsynchronized HMAC replacement and preserves the installed provider', () => {
        encryption.configureDataEncryptionKeyProvider(rotatingProvider())
        const initialIndex = encryption.createEmailBlindIndex('user@example.test')
        expect(() => encryption.configureDataEncryptionKeyProvider(rotatingProvider(Buffer.alloc(32, 99))))
            .toThrow('Blind-index key rotation requires an explicit index migration.')
        expect(encryption.createEmailBlindIndex('user@example.test')).toBe(initialIndex)
    })

    it('validates the HMAC key before accepting a provider', () => {
        expect(() => encryption.configureDataEncryptionKeyProvider(rotatingProvider(Buffer.alloc(31))))
            .toThrow('Blind-index key must contain 32 bytes.')
    })

    it('rejects a legacy keyring whose historical KEKs disagree on the HMAC key', () => {
        writeKeyring('new-kek', Buffer.alloc(32, 99))
        expect(() => encryption.assertDataEncryptionProviderReady())
            .toThrow('Blind-index key rotation requires an explicit index migration.')
    })

    it('rejects replacing an already used local lookup key with a different configured key', () => {
        writeKeyring('old-kek')
        const initialIndex = encryption.createEmailBlindIndex('user@example.test')
        expect(() => encryption.configureDataEncryptionKeyProvider(rotatingProvider(Buffer.alloc(32, 99))))
            .toThrow('Blind-index key rotation requires an explicit index migration.')
        expect(encryption.createEmailBlindIndex('user@example.test')).toBe(initialIndex)
    })

    it('preserves existing h1 indexes and old ciphertext when a legacy keyring rotates only its KEK', () => {
        writeKeyring('old-kek')
        const previous = encryption.encryptFieldValue('users', 'email', 'user@example.test')
        const expectedIndex = `h1_${createHmac('sha256', indexKey)
            .update('autocarehub:email:v1:user@example.test', 'utf8').digest('base64url')}`
        expect(encryption.createEmailBlindIndex('user@example.test')).toBe(expectedIndex)
        writeKeyring('new-kek')
        encryption.invalidateLocalKeyProviderCacheForTests()
        expect(encryption.createEmailBlindIndex('user@example.test')).toBe(expectedIndex)
        expect(encryption.decryptFieldValue('users', 'email', previous)).toBe('user@example.test')
        expect(encryption.encryptFieldValue('users', 'email', 'user@example.test').keyId).toBe('new-kek')
    })

    it('uses the same captured KEK id for encryption and its envelope during a provider refresh', () => {
        const provider = rotatingProvider()
        const getKey = provider.getKey
        provider.getKey = (keyId) => {
            const key = getKey(keyId)
            provider.activeKeyId = 'new-kek'
            return key
        }
        encryption.setDataEncryptionKeyProviderForTests(provider)
        const envelope = encryption.encryptFieldValue('users', 'email', 'user@example.test')
        expect(envelope.keyId).toBe('old-kek')
        expect(encryption.decryptFieldValue('users', 'email', envelope)).toBe('user@example.test')
    })
})
