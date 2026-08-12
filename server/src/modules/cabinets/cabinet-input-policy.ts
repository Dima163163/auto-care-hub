import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_CABINET_TITLE_LENGTH = 160

export function normalizeCabinetTitle(title: string) {
    const normalized = normalizeTextWhitespace(title).replace(/\s+/g, ' ').trim()
    if (normalized.length < 2 || normalized.length > MAX_CABINET_TITLE_LENGTH) {
        throw new Error('Cabinet title is invalid.')
    }

    return normalized
}
