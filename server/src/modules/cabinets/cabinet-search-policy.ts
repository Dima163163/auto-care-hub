import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_CABINET_SEARCH_LENGTH = 100

export function normalizeCabinetSearchTerm(value: string | undefined) {
    if (value === undefined) return undefined

    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    if (!normalized) return undefined
    if (normalized.length > MAX_CABINET_SEARCH_LENGTH) {
        throw new Error('Cabinet search term is invalid.')
    }

    return normalized
}
