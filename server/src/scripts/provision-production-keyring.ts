import { randomBytes } from 'node:crypto'

import { EncryptCommand, KMSClient } from '@aws-sdk/client-kms'

import { KEYRING_ENCRYPTION_CONTEXT } from '../shared/security/data-encryption/production-kms-provider.js'

async function main() {
    const region = process.env.DATA_ENCRYPTION_AWS_KMS_REGION?.trim()
    const keyId = process.env.DATA_ENCRYPTION_AWS_KMS_KEY_ID?.trim()
    if (!region || !keyId) {
        throw new Error('Set DATA_ENCRYPTION_AWS_KMS_REGION and DATA_ENCRYPTION_AWS_KMS_KEY_ID.')
    }

    const activeKeyId = `kms-${randomBytes(9).toString('hex')}`
    const plaintext = Buffer.from(JSON.stringify({
        version: 1,
        activeKeyId,
        keys: {
            [activeKeyId]: {
                kek: randomBytes(32).toString('base64url'),
                indexKey: randomBytes(32).toString('base64url'),
            },
        },
    }), 'utf8')
    const client = new KMSClient({ region })
    try {
        const response = await client.send(new EncryptCommand({
            KeyId: keyId,
            Plaintext: plaintext,
            EncryptionContext: KEYRING_ENCRYPTION_CONTEXT,
        }))
        if (!response.CiphertextBlob?.length) throw new Error('KMS returned no ciphertext.')
        process.stdout.write(`DATA_ENCRYPTION_AWS_KMS_KEYRING=${Buffer.from(response.CiphertextBlob).toString('base64')}\n`)
    } finally {
        plaintext.fill(0)
        client.destroy()
    }
}

main().catch(() => {
    process.stderr.write('Production KMS keyring provisioning failed. Check the key, region and Encrypt permission.\n')
    process.exitCode = 1
})
