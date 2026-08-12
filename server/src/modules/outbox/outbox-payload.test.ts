import { describe, expect, it } from 'vitest'

import {
    assertOutboxPayloadWithinBounds,
    getOutboxPayloadByteLength,
    MAX_OUTBOX_PAYLOAD_BYTES,
} from './outbox-payload.js'

describe('outbox payload bounds', () => {
    it('counts UTF-8 bytes before persistence', () => {
        expect(getOutboxPayloadByteLength({ message: 'Привет' })).toBeGreaterThan(6)
    })

    it('rejects oversized and non-serializable payloads', () => {
        expect(() => assertOutboxPayloadWithinBounds({ value: 'x'.repeat(MAX_OUTBOX_PAYLOAD_BYTES) })).toThrow()
        const circular: Record<string, unknown> = {}
        circular.self = circular
        expect(() => assertOutboxPayloadWithinBounds(circular)).toThrow()
    })

    it('rejects plaintext secret fields at any nesting level', () => {
        for (const field of ['token', 'password', 'passwordHash', 'accessToken', 'refreshToken', 'authorization', 'secret']) {
            expect(() => assertOutboxPayloadWithinBounds({ metadata: { credentials: { [field]: 'private-value' } } })).toThrow(
                `Outbox payload contains forbidden secret field: ${field}.`,
            )
        }
    })

    it('allows the encrypted auth-token envelope field', () => {
        expect(() => assertOutboxPayloadWithinBounds({
            template: 'password_reset',
            encryptedToken: 'encrypted-envelope',
        })).not.toThrow()
    })
})
