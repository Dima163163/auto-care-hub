import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'
import { normalizeLocale, type SupportedLocale } from '../../config/i18n.js'

export const MAX_PREFERRED_CITY_LENGTH = 120
export const MAX_PREFERRED_CATEGORY_LENGTH = 60
export const MAX_PREFERRED_CATEGORIES = 12

export function normalizeUserLocale(locale: unknown): SupportedLocale | null | undefined {
    if (locale === null || locale === undefined) return locale
    if (typeof locale !== 'string') throw new Error('Locale is invalid.')

    const normalized = normalizeLocale(locale)
    if (!normalized) {
        throw new Error('Locale is invalid.')
    }

    return normalized
}

export function normalizePreferredCity(city: unknown) {
    if (city === null || city === undefined) return city
    if (typeof city !== 'string') throw new Error('Preferred city is invalid.')

    const normalized = normalizeTextWhitespace(city.normalize('NFKC')).replace(/\s+/g, ' ').trim()
    if (normalized.length > MAX_PREFERRED_CITY_LENGTH) {
        throw new Error('Preferred city is invalid.')
    }

    return normalized || null
}

export function normalizePreferredCategories(categories: unknown) {
    if (!Array.isArray(categories)) throw new Error('Preferred categories are invalid.')
    const normalized = [...new Set(categories.map((category) => {
        if (typeof category !== 'string') throw new Error('Preferred category is invalid.')
        const value = normalizeTextWhitespace(category.normalize('NFKC')).replace(/\s+/g, ' ').trim()
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

export type NormalizedUserPreferencesInput = {
    emailNotifications?: boolean
    bookingEmailNotifications?: boolean
    preferredCity?: string | null
    preferredCategories?: string[]
    locale?: SupportedLocale | null
}

/** Re-check partial preference updates before notification or profile persistence. */
export function normalizeUserPreferencesInput(input: unknown): NormalizedUserPreferencesInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const allowedKeys = new Set(['emailNotifications', 'bookingEmailNotifications', 'preferredCity', 'preferredCategories', 'locale'])
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null
    if (value.emailNotifications !== undefined && typeof value.emailNotifications !== 'boolean') return null
    if (value.bookingEmailNotifications !== undefined && typeof value.bookingEmailNotifications !== 'boolean') return null
    try {
        const preferredCity = value.preferredCity === undefined ? undefined : normalizePreferredCity(value.preferredCity)
        const preferredCategories = value.preferredCategories === undefined ? undefined : normalizePreferredCategories(value.preferredCategories)
        const locale = value.locale === undefined ? undefined : normalizeUserLocale(value.locale)
        return {
            ...(value.emailNotifications !== undefined ? { emailNotifications: value.emailNotifications } : {}),
            ...(value.bookingEmailNotifications !== undefined ? { bookingEmailNotifications: value.bookingEmailNotifications } : {}),
            ...(value.preferredCity !== undefined ? { preferredCity: preferredCity ?? null } : {}),
            ...(value.preferredCategories !== undefined ? { preferredCategories: preferredCategories ?? [] } : {}),
            ...(value.locale !== undefined ? { locale: locale ?? null } : {}),
        }
    } catch {
        return null
    }
}
