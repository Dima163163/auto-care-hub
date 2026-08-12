import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'
import { normalizeLocale, type SupportedLocale } from '../../config/i18n.js'

export const MAX_PREFERRED_CITY_LENGTH = 120
export const MAX_PREFERRED_CATEGORY_LENGTH = 60
export const MAX_PREFERRED_CATEGORIES = 12

export function normalizeUserLocale(locale: string | null | undefined): SupportedLocale | null | undefined {
    if (locale === null || locale === undefined) return locale

    const normalized = normalizeLocale(locale)
    if (!normalized) {
        throw new Error('Locale is invalid.')
    }

    return normalized
}

export function normalizePreferredCity(city: string | null | undefined) {
    if (city === null || city === undefined) return city

    const normalized = normalizeTextWhitespace(city).replace(/\s+/g, ' ').trim()
    if (normalized.length > MAX_PREFERRED_CITY_LENGTH) {
        throw new Error('Preferred city is invalid.')
    }

    return normalized || null
}

export function normalizePreferredCategories(categories: string[]) {
    const normalized = [...new Set(categories.map((category) => {
        const value = normalizeTextWhitespace(category).replace(/\s+/g, ' ').trim()
        if (!value || value.length > MAX_PREFERRED_CATEGORY_LENGTH) {
            throw new Error('Preferred category is invalid.')
        }
        return value
    }))]

    if (normalized.length > MAX_PREFERRED_CATEGORIES) {
        throw new Error('Too many preferred categories.')
    }

    return normalized
}
