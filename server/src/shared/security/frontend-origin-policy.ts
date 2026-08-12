import { stripControlCharacters } from './string-normalization.js'

export const MAX_FRONTEND_ORIGIN_LENGTH = 512

function isLoopbackHost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function normalizeFrontendOrigin(value: string, options: { allowHttpLoopback?: boolean } = {}) {
    const normalized = stripControlCharacters(value).trim()
    if (!normalized || normalized.length > MAX_FRONTEND_ORIGIN_LENGTH) {
        throw new Error('Frontend origin is invalid.')
    }

    let parsed: URL
    try {
        parsed = new URL(normalized)
    } catch {
        throw new Error('Frontend origin is invalid.')
    }

    const isLoopback = isLoopbackHost(parsed.hostname)
    const allowsHttp = options.allowHttpLoopback === true && isLoopback
    if (
        (parsed.protocol !== 'https:' && !allowsHttp)
        || parsed.username
        || parsed.password
        || parsed.pathname !== '/'
        || parsed.search
        || parsed.hash
    ) {
        throw new Error('Frontend origin is invalid.')
    }

    return parsed.origin
}
