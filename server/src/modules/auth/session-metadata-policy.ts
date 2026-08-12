import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export function normalizeStoredSessionValue(value: string | null | undefined) {
    if (!value) return null

    const normalized = normalizeTextWhitespace(value)
        .replace(/\s+/g, ' ')
        .trim()

    return normalized || null
}
