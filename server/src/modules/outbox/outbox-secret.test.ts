import { describe, expect, it } from 'vitest'

import {
    decryptOutboxSecret,
    encryptOutboxSecret,
    redactOutboxSecrets,
} from './outbox-secret.js'

describe('outbox secret envelope', () => {
    it('encrypts secrets without persisting the plaintext', () => {
        const secret = 'setup-token-value-that-must-stay-private'
        const envelope = encryptOutboxSecret(secret)

        expect(envelope).not.toContain(secret)
        expect(decryptOutboxSecret(envelope)).toBe(secret)
    })

    it('rejects tampered envelopes without exposing crypto details', () => {
        const envelope = JSON.parse(encryptOutboxSecret('secret-value')) as {
            ciphertext: string
        }
        const replacement = envelope.ciphertext.endsWith('x') ? 'y' : 'x'
        envelope.ciphertext = `${envelope.ciphertext.slice(0, -1)}${replacement}`

        expect(() => decryptOutboxSecret(JSON.stringify(envelope))).toThrow(
            'Outbox secret envelope is invalid or cannot be decrypted.',
        )
    })

    it('rejects malformed or non-canonical envelope fields', () => {
        const envelope = JSON.parse(encryptOutboxSecret('secret-value')) as {
            iv: string
            authTag: string
            ciphertext: string
        }

        for (const field of ['iv', 'authTag', 'ciphertext'] as const) {
            const malformed = { ...envelope, [field]: `${envelope[field]}=` }
            expect(() => decryptOutboxSecret(JSON.stringify({ version: 1, ...malformed }))).toThrow(
                'Outbox secret envelope is invalid or cannot be decrypted.',
            )
        }

        expect(() => decryptOutboxSecret(JSON.stringify({
            version: 1,
            iv: envelope.iv.slice(0, -2),
            authTag: envelope.authTag,
            ciphertext: envelope.ciphertext,
        }))).toThrow('Outbox secret envelope is invalid or cannot be decrypted.')
    })

    it('removes both legacy and encrypted token fields after dispatch', () => {
        expect(redactOutboxSecrets({
            template: 'password_reset',
            token: 'legacy-secret',
            encryptedToken: 'encrypted-secret',
        })).toEqual({ template: 'password_reset' })
    })
})
