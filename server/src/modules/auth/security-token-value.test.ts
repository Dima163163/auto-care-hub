import { describe, expect, it } from 'vitest'

import {
    assertSecurityTokenInput,
    createSecurityTokenValue,
    hashSecurityTokenValue,
    isSecurityTokenExpired,
} from './security-token-value'

describe('security token values', () => {
    it('creates URL-safe random token values', () => {
        const firstToken = createSecurityTokenValue()
        const secondToken = createSecurityTokenValue()

        expect(firstToken).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(firstToken).not.toBe(secondToken)
    })

    it('hashes token values without exposing the original token', () => {
        const token = 'setup-token'
        const tokenHash = hashSecurityTokenValue(token)

        expect(tokenHash).toHaveLength(64)
        expect(tokenHash).not.toBe(token)
        expect(hashSecurityTokenValue(token)).toBe(tokenHash)
    })

    it('detects expired tokens', () => {
        const now = new Date('2026-05-30T12:00:00.000Z')
        const past = new Date('2026-05-30T11:59:59.000Z')
        const future = new Date('2026-05-30T12:00:01.000Z')

        expect(isSecurityTokenExpired(past, now)).toBe(true)
        expect(isSecurityTokenExpired(now, now)).toBe(true)
        expect(isSecurityTokenExpired(future, now)).toBe(false)
    })

    it('rejects malformed lookup tokens before hashing', () => {
        expect(() => assertSecurityTokenInput('too-short')).toThrow(/invalid/)
        expect(() => assertSecurityTokenInput(`${'a'.repeat(31)}!`)).toThrow(/invalid/)
        expect(assertSecurityTokenInput('a'.repeat(32))).toHaveLength(32)
    })
})
