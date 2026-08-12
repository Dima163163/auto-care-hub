import { describe, expect, it } from 'vitest'

import {
    MAX_PREFERRED_CATEGORIES,
    MAX_PREFERRED_CATEGORY_LENGTH,
    normalizePreferredCategories,
    normalizePreferredCity,
    normalizeUserLocale,
} from './user-preferences-policy.js'

describe('user preference policy', () => {
    it('normalizes cities and deduplicates categories', () => {
        expect(normalizePreferredCity('  Samara\n city ')).toBe('Samara city')
        expect(normalizePreferredCategories(['  Beauty  ', 'Beauty'])).toEqual(['Beauty'])
    })

    it('rejects oversized preference values', () => {
        expect(() => normalizePreferredCity('x'.repeat(121))).toThrow(/city/)
        expect(() => normalizePreferredCategories(['x'.repeat(MAX_PREFERRED_CATEGORY_LENGTH + 1)])).toThrow(/category/)
        expect(() => normalizePreferredCategories(Array.from({ length: MAX_PREFERRED_CATEGORIES + 1 }, (_, index) => `c${index}`))).toThrow(/categories/)
    })

    it('normalizes supported account locales and rejects unknown values', () => {
        expect(normalizeUserLocale('DE-DE')).toBe('de')
        expect(normalizeUserLocale(null)).toBeNull()
        expect(() => normalizeUserLocale('xx')).toThrow(/locale/i)
    })
})
