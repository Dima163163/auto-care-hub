export const CORS_METHODS = [
    'GET',
    'POST',
    'PATCH',
    'DELETE',
    'OPTIONS',
] as const

export const CORS_ALLOWED_HEADERS = [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'Idempotency-Key',
] as const

export function validateCorsOrigins(origins: readonly string[]) {
    if (origins.length === 0 || origins.includes('*')) {
        throw new Error('CORS origins must be explicit and non-empty.')
    }

    for (const origin of origins) {
        const parsed = new URL(origin)
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
            throw new Error('CORS origins must be explicit HTTP(S) origins.')
        }
    }

    return origins
}

export function getCorsOptions(origins: string[]) {
    validateCorsOrigins(origins)

    return {
        origin: [...origins],
        credentials: true,
        methods: [...CORS_METHODS],
        allowedHeaders: [...CORS_ALLOWED_HEADERS],
    }
}
