import { describe, expect, it } from 'vitest'

import { normalizeAuthEmail } from './email-policy.js'

describe('auth email policy', () => {
    it('normalizes valid addresses', () => {
        expect(normalizeAuthEmail('  USER@Example.COM ')).toBe('user@example.com')
    })

    it('rejects malformed and oversized addresses', () => {
        expect(() => normalizeAuthEmail('invalid')).toThrow(/invalid/)
        expect(() => normalizeAuthEmail(`${'a'.repeat(313)}@x.com`)).toThrow(/invalid/)
    })
})
