import { stripControlCharacters } from './string-normalization.js'

export const MAX_OAUTH_REDIRECT_URI_LENGTH = 2_048

export function validateOAuthRedirectUri(value: string, isProduction: boolean) {
    const normalized = stripControlCharacters(value).trim()
    if (!normalized || normalized.length > MAX_OAUTH_REDIRECT_URI_LENGTH) {
        throw new Error('OAuth redirect URI is not allowed.')
    }

    let parsed: URL
    try {
        parsed = new URL(normalized)
    } catch {
        throw new Error('OAuth redirect URI must be a valid URL.')
    }

    const isLoopback = parsed.hostname === 'localhost'
        || parsed.hostname === '127.0.0.1'
        || parsed.hostname === '[::1]'

    if (
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        (isProduction && parsed.protocol !== 'https:') ||
        (!isProduction && parsed.protocol === 'http:' && !isLoopback)
    ) {
        throw new Error('OAuth redirect URI is not allowed.')
    }

    return parsed.toString()
}
