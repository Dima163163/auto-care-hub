import { describe, expect, it } from 'vitest'

import { normalizeAuthUserName } from './user-input-policy.js'

describe('auth user input policy', () => {
    it('normalizes names without control characters', () => {
        expect(normalizeAuthUserName('  Ada\n Lovelace  ')).toBe('Ada Lovelace')
    })

    it('rejects names outside the service bounds', () => {
        expect(() => normalizeAuthUserName('A')).toThrow(/invalid/)
        expect(() => normalizeAuthUserName('x'.repeat(121))).toThrow(/invalid/)
    })
})
