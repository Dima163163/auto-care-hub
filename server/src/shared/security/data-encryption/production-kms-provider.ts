import { DecryptCommand, KMSClient } from '@aws-sdk/client-kms'

import { configureDataEncryptionKeyProvider, parseDataEncryptionKeyring } from './field-encryption.js'

export const KEYRING_ENCRYPTION_CONTEXT = {
    application: 'autocare-hub',
    purpose: 'field-encryption-keyring',
    version: '1',
} as const

type KmsDecryptClient = {
    send(command: DecryptCommand, options?: { abortSignal?: AbortSignal }): Promise<{ Plaintext?: Uint8Array }>
}

type KmsKeyringConfig = {
    region: string
    keyId: string
    ciphertextBase64: string
}

let loadPromise: Promise<void> | null = null

function requiredProductionConfig(): KmsKeyringConfig {
    const region = process.env.DATA_ENCRYPTION_AWS_KMS_REGION?.trim()
    const keyId = process.env.DATA_ENCRYPTION_AWS_KMS_KEY_ID?.trim()
    const ciphertextBase64 = process.env.DATA_ENCRYPTION_AWS_KMS_KEYRING?.trim()
    if (!region || !keyId || !ciphertextBase64) {
        throw new Error('Production field encryption requires an AWS KMS region, key ID and encrypted keyring.')
    }
    return { region, keyId, ciphertextBase64 }
}

function decodeCiphertext(value: string): Buffer {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
        throw new Error('Production KMS keyring ciphertext is invalid.')
    }
    const decoded = Buffer.from(value, 'base64')
    if (decoded.length === 0 || decoded.toString('base64') !== value) {
        throw new Error('Production KMS keyring ciphertext is invalid.')
    }
    return decoded
}

export async function loadProductionKmsKeyProvider(
    clientFactory: (region: string) => KmsDecryptClient = (region) => new KMSClient({ region, maxAttempts: 2 }),
): Promise<void> {
    if ((process.env.NODE_ENV ?? 'development') !== 'production') return
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
        const { region, keyId, ciphertextBase64 } = requiredProductionConfig()
        const client = clientFactory(region)
        let plaintext: Uint8Array | undefined
        try {
            const result = await client.send(new DecryptCommand({
                CiphertextBlob: decodeCiphertext(ciphertextBase64),
                KeyId: keyId,
                EncryptionContext: KEYRING_ENCRYPTION_CONTEXT,
            }), { abortSignal: AbortSignal.timeout(15_000) })
            plaintext = result.Plaintext
            if (!plaintext?.length) throw new Error('empty KMS response')
            configureDataEncryptionKeyProvider(parseDataEncryptionKeyring(Buffer.from(plaintext).toString('utf8')))
        } catch {
            throw new Error('Production KMS keyring could not be loaded.')
        } finally {
            plaintext?.fill(0)
            if ('destroy' in client && typeof client.destroy === 'function') client.destroy()
        }
    })()
    return loadPromise
}
