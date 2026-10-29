import { describe, expect, it } from 'vitest'

import { createTotpUri, encodeTotpSecret, generateTotpCode, generateTotpSecret, matchTotpCode } from './totp.js'

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('RFC 6238 TOTP', () => {
    it('matches the published SHA-1 test vectors', () => {
        const vectors = [
            [59, '94287082'],
            [1111111109, '07081804'],
            [1111111111, '14050471'],
            [1234567890, '89005924'],
            [2000000000, '69279037'],
            [20000000000, '65353130'],
        ] as const
        for (const [seconds, expected] of vectors) {
            expect(generateTotpCode(RFC_SECRET, Math.floor(seconds / 30), 8)).toBe(expected)
        }
    })

    it('creates a 160-bit secret with an interoperable otpauth URI', () => {
        const secret = generateTotpSecret()
        expect(secret).toMatch(/^[A-Z2-7]{32}$/)
        expect(encodeTotpSecret(Buffer.from('12345678901234567890'))).toBe(RFC_SECRET)
        expect(createTotpUri(secret, 'admin@example.com')).toContain(`secret=${secret}`)
    })

    it('accepts a small clock window once and rejects malformed codes', () => {
        const now = 1_234_567_890_000
        const current = Math.floor(now / 30_000)
        const previousCode = generateTotpCode(RFC_SECRET, current - 1)
        expect(matchTotpCode(RFC_SECRET, previousCode, -1, now)).toBe(current - 1)
        expect(matchTotpCode(RFC_SECRET, previousCode, current - 1, now)).toBeNull()
        expect(matchTotpCode(RFC_SECRET, '12345', -1, now)).toBeNull()
        expect(matchTotpCode(RFC_SECRET, 'abcdef', -1, now)).toBeNull()
    })
})
