import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const indexKey = Buffer.alloc(32, 41)
const kek = Buffer.alloc(32, 42)
const ciphertext = Buffer.from('synthetic-kms-ciphertext')

function keyring() {
    return Buffer.from(JSON.stringify({
        version: 1,
        activeKeyId: 'kms-test',
        keys: {
            'kms-test': {
                kek: kek.toString('base64url'),
                indexKey: indexKey.toString('base64url'),
            },
        },
    }))
}

beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATA_ENCRYPTION_AWS_KMS_REGION', 'eu-central-1')
    vi.stubEnv('DATA_ENCRYPTION_AWS_KMS_KEY_ID', 'arn:aws:kms:eu-central-1:111122223333:key/example')
    vi.stubEnv('DATA_ENCRYPTION_AWS_KMS_KEYRING', ciphertext.toString('base64'))
})

afterEach(() => vi.unstubAllEnvs())

describe('production AWS KMS key provider', () => {
    it('loads before synchronous field encryption and binds decrypt to the configured key and context', async () => {
        const plaintext = keyring()
        const send = vi.fn(async (command: { input: Record<string, unknown> }) => {
            expect(command.input).toMatchObject({
                KeyId: 'arn:aws:kms:eu-central-1:111122223333:key/example',
                CiphertextBlob: ciphertext,
                EncryptionContext: {
                    application: 'autocare-hub',
                    purpose: 'field-encryption-keyring',
                    version: '1',
                },
            })
            return { Plaintext: plaintext }
        })
        const { loadProductionKmsKeyProvider } = await import('./production-kms-provider.js')
        await loadProductionKmsKeyProvider(() => ({ send }))
        await loadProductionKmsKeyProvider(() => { throw new Error('KMS should only be called once') })

        const encryption = await import('./field-encryption.js')
        const envelope = encryption.encryptFieldValue('users', 'email', 'user@example.test')
        expect(envelope.keyId).toBe('kms-test')
        expect(encryption.decryptFieldValue('users', 'email', envelope)).toBe('user@example.test')
        expect(encryption.createEmailBlindIndex('user@example.test')).toMatch(/^h1_/)
        expect(plaintext.every((value) => value === 0)).toBe(true)
        expect(send).toHaveBeenCalledTimes(1)
    })

    it('fails closed when the encrypted keyring is not configured', async () => {
        vi.stubEnv('DATA_ENCRYPTION_AWS_KMS_KEYRING', '')
        const { loadProductionKmsKeyProvider } = await import('./production-kms-provider.js')
        await expect(loadProductionKmsKeyProvider()).rejects.toThrow('requires an AWS KMS region, key ID and encrypted keyring')
        const { assertDataEncryptionProviderReady } = await import('./field-encryption.js')
        expect(() => assertDataEncryptionProviderReady()).toThrow('requires an external KMS key provider')
    })

    it('fails closed when KMS denies decrypt', async () => {
        const { loadProductionKmsKeyProvider } = await import('./production-kms-provider.js')
        await expect(loadProductionKmsKeyProvider(() => ({ send: async () => { throw new Error('AccessDenied') } })))
            .rejects.toThrow('Production KMS keyring could not be loaded.')
        const { assertDataEncryptionProviderReady } = await import('./field-encryption.js')
        expect(() => assertDataEncryptionProviderReady()).toThrow('requires an external KMS key provider')
    })

    it('rejects malformed ciphertext before contacting KMS', async () => {
        vi.stubEnv('DATA_ENCRYPTION_AWS_KMS_KEYRING', 'not base64!')
        const send = vi.fn(async () => ({ Plaintext: keyring() }))
        const { loadProductionKmsKeyProvider } = await import('./production-kms-provider.js')
        await expect(loadProductionKmsKeyProvider(() => ({ send })))
            .rejects.toThrow('Production KMS keyring could not be loaded.')
        expect(send).not.toHaveBeenCalled()
    })
})
