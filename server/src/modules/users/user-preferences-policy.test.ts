import { describe, expect, it } from 'vitest'

import {
    MAX_PREFERRED_CATEGORIES,
    MAX_PREFERRED_CATEGORY_LENGTH,
    normalizePreferredCategories,
    normalizePreferredCity,
    normalizeUserPreferencesInput,
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

    it('normalizes a partial update without allowing unknown keys or malformed runtime values', () => {
        expect(normalizeUserPreferencesInput({ emailNotifications: false, preferredCity: '  Samara\n city ', preferredCategories: [' Service ', 'Service'], locale: 'RU' })).toEqual({ emailNotifications: false, preferredCity: 'Samara city', preferredCategories: ['Service'], locale: 'ru' })
        expect(normalizeUserPreferencesInput({ bookingEmailNotifications: true })).toEqual({ bookingEmailNotifications: true })
        expect(normalizeUserPreferencesInput({ preferredCity: 42 })).toBeNull()
        expect(normalizeUserPreferencesInput({ preferredCategories: ['ok', 42] })).toBeNull()
        expect(normalizeUserPreferencesInput({ locale: 'xx' })).toBeNull()
        expect(normalizeUserPreferencesInput({ emailNotifications: 'yes' })).toBeNull()
        expect(normalizeUserPreferencesInput({ unknown: true })).toBeNull()
        expect(normalizeUserPreferencesInput(null)).toBeNull()
    })
})
