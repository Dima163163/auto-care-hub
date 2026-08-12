import { stripControlCharacters } from '../../shared/security/string-normalization.js'

export const MAX_OAUTH_PROVIDER_SUBJECT_LENGTH = 255

export function normalizeOAuthProviderSubject(value: string) {
    const normalized = stripControlCharacters(value)
        .trim()

    if (
        normalized.length < 1
        || normalized.length > MAX_OAUTH_PROVIDER_SUBJECT_LENGTH
    ) {
        throw new Error('OAuth provider subject is invalid.')
    }

    return normalized
}
