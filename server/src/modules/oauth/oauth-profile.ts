import { normalizeTextWhitespace, stripControlCharacters } from '../../shared/security/string-normalization.js'

export const MAX_OAUTH_PROVIDER_ID_LENGTH = 256
export const MAX_OAUTH_NAME_LENGTH = 120
export const MAX_OAUTH_AVATAR_URL_LENGTH = 2_048

export type OAuthProfileInput = {
    providerId: string
    email: string
    name: string
    avatarUrl: string | null
    isEmailVerified: boolean
}

export function normalizeOAuthProfile(input: OAuthProfileInput) {
    const providerId = stripControlCharacters(input.providerId).trim()
    const email = stripControlCharacters(input.email).trim().toLowerCase()
    const name = normalizeTextWhitespace(input.name).replace(/\s+/g, ' ').trim()

    if (
        providerId.length < 1 ||
        providerId.length > MAX_OAUTH_PROVIDER_ID_LENGTH ||
        !email.includes('@') ||
        email.length > 320 ||
        name.length < 1 ||
        name.length > MAX_OAUTH_NAME_LENGTH
    ) {
        throw new Error('OAuth profile is outside accepted bounds.')
    }

    let avatarUrl: string | null = null
    if (input.avatarUrl) {
        const candidate = input.avatarUrl.trim()
        const parsed = new URL(candidate)
        if (parsed.protocol !== 'https:' || candidate.length > MAX_OAUTH_AVATAR_URL_LENGTH) {
            throw new Error('OAuth avatar URL is outside accepted bounds.')
        }
        avatarUrl = candidate
    }

    return {
        providerId,
        email,
        name,
        avatarUrl,
        isEmailVerified: input.isEmailVerified === true,
    }
}
