export const MAX_STRIPE_IDENTIFIER_LENGTH = 255
const STRIPE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/

export function normalizeStripeIdentifier(value: unknown, fieldName: string) {
    if (value === undefined || value === null) return undefined
    if (typeof value !== 'string') throw new Error(`${fieldName} must be a string.`)

    const normalized = value.trim()
    if (
        normalized.length < 1 ||
        normalized.length > MAX_STRIPE_IDENTIFIER_LENGTH ||
        !STRIPE_IDENTIFIER_PATTERN.test(normalized)
    ) {
        throw new Error(`${fieldName} is invalid.`)
    }

    return normalized
}
