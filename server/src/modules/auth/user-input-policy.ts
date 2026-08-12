import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_AUTH_USER_NAME_LENGTH = 120

export function normalizeAuthUserName(name: string) {
    const normalized = normalizeTextWhitespace(name).replace(/\s+/g, ' ').trim()
    if (normalized.length < 2 || normalized.length > MAX_AUTH_USER_NAME_LENGTH) {
        throw new Error('User name is invalid.')
    }

    return normalized
}
