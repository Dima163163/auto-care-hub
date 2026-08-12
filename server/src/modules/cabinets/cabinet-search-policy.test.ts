import { describe, expect, it } from 'vitest'

import { normalizeCabinetSearchTerm } from './cabinet-search-policy.js'

describe('cabinet search policy', () => {
    it('normalizes optional search terms', () => {
        expect(normalizeCabinetSearchTerm('  quiet\nroom  ')).toBe('quiet room')
        expect(normalizeCabinetSearchTerm(undefined)).toBeUndefined()
    })

    it('ignores blank and rejects oversized terms', () => {
        expect(normalizeCabinetSearchTerm(' ')).toBeUndefined()
        expect(() => normalizeCabinetSearchTerm('x'.repeat(101))).toThrow(/invalid/)
    })
})
