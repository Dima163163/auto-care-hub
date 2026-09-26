import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ENVELOPE_VERSION = 1

function getEncryptionKey(value = process.env.RELEASE_EVIDENCE_ENCRYPTION_KEY) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('RELEASE_EVIDENCE_ENCRYPTION_KEY must be configured as a base64-encoded 32-byte key.')
    }
    const key = Buffer.from(value, 'base64')
    if (key.length !== 32 || key.toString('base64').replace(/=+$/, '') !== value.trim().replace(/=+$/, '')) {
        throw new Error('RELEASE_EVIDENCE_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.')
    }
    return key
}

export function encryptReleaseEvidence(plaintext, keyValue) {
    const key = getEncryptionKey(keyValue)
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, nonce)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    return {
        schemaVersion: ENVELOPE_VERSION,
        algorithm: 'aes-256-gcm',
        nonce: nonce.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
    }
}

export function decryptReleaseEvidence(envelope, keyValue) {
    const key = getEncryptionKey(keyValue)
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
        || envelope.schemaVersion !== ENVELOPE_VERSION
        || envelope.algorithm !== 'aes-256-gcm'
        || typeof envelope.nonce !== 'string'
        || typeof envelope.tag !== 'string'
        || typeof envelope.ciphertext !== 'string') {
        throw new Error('Encrypted release evidence envelope is invalid.')
    }
    const nonce = Buffer.from(envelope.nonce, 'base64')
    const tag = Buffer.from(envelope.tag, 'base64')
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
    if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
        throw new Error('Encrypted release evidence envelope has invalid cryptographic fields.')
    }
    const decipher = createDecipheriv('aes-256-gcm', key, nonce)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
