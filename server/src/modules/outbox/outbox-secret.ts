import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'

import { env } from '../../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const envelopeSchema = z.object({
    version: z.literal(1),
    iv: z.string().min(1),
    authTag: z.string().min(1),
    ciphertext: z.string().min(1),
})

function decodeCanonicalBase64Url(value: string, expectedBytes?: number) {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error('Invalid base64url value')
    }

    const decoded = Buffer.from(value, 'base64url')
    if (decoded.length === 0 || decoded.toString('base64url') !== value) {
        throw new Error('Non-canonical base64url value')
    }

    if (expectedBytes !== undefined && decoded.length !== expectedBytes) {
        throw new Error('Unexpected base64url length')
    }

    return decoded
}

function getEncryptionKey() {
    return createHash('sha256').update(env.outboxTokenEncryptionKey, 'utf8').digest()
}

export function encryptOutboxSecret(secret: string) {
    if (!secret || secret.length > 512) {
        throw new Error('Outbox secret is invalid.')
    }

    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])

    return JSON.stringify({
        version: 1,
        iv: iv.toString('base64url'),
        authTag: cipher.getAuthTag().toString('base64url'),
        ciphertext: ciphertext.toString('base64url'),
    })
}

export function decryptOutboxSecret(envelope: string) {
    try {
        const parsed = envelopeSchema.parse(JSON.parse(envelope))
        const iv = decodeCanonicalBase64Url(parsed.iv, IV_BYTES)
        const authTag = decodeCanonicalBase64Url(parsed.authTag, 16)
        const ciphertext = decodeCanonicalBase64Url(parsed.ciphertext)
        const decipher = createDecipheriv(
            ALGORITHM,
            getEncryptionKey(),
            iv,
        )
        decipher.setAuthTag(authTag)
        const plaintext = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
        ]).toString('utf8')

        if (!plaintext || plaintext.length > 512) {
            throw new Error('Invalid plaintext')
        }

        return plaintext
    } catch {
        throw new Error('Outbox secret envelope is invalid or cannot be decrypted.')
    }
}

export function redactOutboxSecrets(payload: Record<string, unknown>) {
    const sanitized = { ...payload }
    delete sanitized.token
    delete sanitized.encryptedToken
    return sanitized
}
