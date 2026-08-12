import { describe, expect, it } from 'vitest'

import { normalizeEmailAddress } from './email-address-policy.js'

describe('email address policy', () => {
    it('trims, lowercases, and bounds recipients', () => {
        expect(normalizeEmailAddress(' User@Example.COM ')).toBe('user@example.com')
    })

    it('rejects malformed and control-containing recipients', () => {
        expect(() => normalizeEmailAddress('not-an-email')).toThrow(/Email/)
        expect(() => normalizeEmailAddress('user@example.com\nBcc: attacker@example.com')).toThrow(/Email/)
    })
})
