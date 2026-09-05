const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const createKeys = new Set(['rating', 'text', 'idempotencyKey'])
const responseKeys = new Set(['response'])

function isRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function normalizeText(value: unknown, minLength: number, maxLength: number) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null
}

function normalizeOptionalIdempotencyKey(value: unknown) {
    if (value === undefined || value === null) return undefined
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return /^[a-zA-Z0-9_-]{8,128}$/.test(normalized) ? normalized : null
}

export function normalizePlatformReviewUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizePlatformReviewCreateInput(input: unknown) {
    if (!isRecord(input) || Object.keys(input).some((key) => !createKeys.has(key))) return null
    if (typeof input.rating !== 'number' || !Number.isSafeInteger(input.rating) || input.rating < 1 || input.rating > 5) return null
    const text = normalizeText(input.text, 10, 1_000)
    if (!text) return null
    const idempotencyKey = normalizeOptionalIdempotencyKey(input.idempotencyKey)
    if (idempotencyKey === null) return null
    return {
        rating: input.rating,
        text,
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    }
}

export function normalizePlatformReviewResponseInput(input: unknown) {
    if (!isRecord(input) || Object.keys(input).some((key) => !responseKeys.has(key))) return null
    const response = normalizeText(input.response, 5, 2_000)
    return response ? { response } : null
}

export function normalizePlatformReviewsLimit(value: unknown): number | null {
    if (value === undefined) return 30
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 50 ? value : null
}
