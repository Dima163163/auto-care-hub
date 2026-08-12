export const MAX_RATE_LIMIT_KEY_LENGTH = 320

export function normalizeRateLimitKey(value: string) {
    const normalized = value.trim().toLowerCase()

    if (!normalized || normalized.length > MAX_RATE_LIMIT_KEY_LENGTH) {
        return undefined
    }

    return normalized
}
