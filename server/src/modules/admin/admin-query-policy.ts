import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_ADMIN_SEARCH_LENGTH = 160

export function normalizeAdminSearch(value: string | undefined) {
    if (value === undefined) return undefined

    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    if (!normalized) return undefined
    if (normalized.length > MAX_ADMIN_SEARCH_LENGTH) {
        throw new Error('Admin search is invalid.')
    }

    return normalized
}
