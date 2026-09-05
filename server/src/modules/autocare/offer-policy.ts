import type { AutoCareServiceOfferDecision, CreateAutoCareServiceOfferInput } from './autocare.types.js'

/**
 * Keep service-offer decisions closed over the two persisted transition
 * values. HTTP routes already use an enum, but jobs and replay handlers can
 * call the service directly and must not be able to smuggle arbitrary values
 * into repair-event metadata or transition logic.
 */
export function normalizeAutoCareServiceOfferDecision(value: unknown): AutoCareServiceOfferDecision | null {
    return value === 'accept' || value === 'decline' ? value : null
}

export type NormalizedAutoCareServiceOfferInput = {
    type: CreateAutoCareServiceOfferInput['type']
    title: string
    description: string | null
    discountPercent: number | null
    couponCode: string | null
    amountMinor: number | null
    currencyCode: string | null
    expiresAt: string | null
}

const MAX_TITLE_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 4_000
const MAX_AMOUNT_MINOR = 1_000_000_000
const couponPattern = /^[A-Z0-9_-]{4,32}$/
const datetimeWithOffsetPattern = /(?:Z|[+-]\d{2}:\d{2})$/
const invalid = Symbol('invalid')

type Invalid = typeof invalid

function optionalTrimmedString(value: unknown, maxLength: number): string | null | Invalid {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return invalid
    const normalized = value.normalize('NFKC').trim()
    if (normalized.length > maxLength) return invalid
    return normalized || null
}

function optionalInteger(value: unknown, min: number, max: number): number | null | Invalid {
    if (value === undefined || value === null) return null
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) return invalid
    return value
}

function optionalDateTime(value: unknown): string | null | Invalid {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return invalid
    const normalized = value.normalize('NFKC').trim()
    if (!datetimeWithOffsetPattern.test(normalized) || Number.isNaN(Date.parse(normalized))) return invalid
    return normalized
}

/**
 * Route schemas validate offers at the HTTP boundary, but this service is also
 * called by jobs, tests and replay handlers. Keep the persisted offer shape
 * canonical and fail closed when an internal caller bypasses Zod.
 */
export function normalizeAutoCareServiceOfferInput(input: unknown): NormalizedAutoCareServiceOfferInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (value.type !== 'discount' && value.type !== 'alternative') return null

    const title = optionalTrimmedString(value.title, MAX_TITLE_LENGTH)
    if (title === invalid || !title || title.length < 2) return null

    const description = optionalTrimmedString(value.description, MAX_DESCRIPTION_LENGTH)
    if (description === invalid) return null

    const discountPercent = optionalInteger(value.discountPercent, 1, 100)
    if (discountPercent === invalid || (value.type === 'discount' && discountPercent === null)) return null
    if (value.type === 'alternative' && discountPercent !== null) return null

    const rawCouponCode = optionalTrimmedString(value.couponCode, 32)
    if (rawCouponCode === invalid) return null
    const couponCode = rawCouponCode ? rawCouponCode.toUpperCase() : null
    if (couponCode && !couponPattern.test(couponCode)) return null
    if (value.type === 'alternative' && couponCode !== null) return null

    const amountMinor = optionalInteger(value.amountMinor, 1, MAX_AMOUNT_MINOR)
    if (amountMinor === invalid) return null

    const rawCurrencyCode = optionalTrimmedString(value.currencyCode, 3)
    if (rawCurrencyCode === invalid) return null
    const currencyCode = rawCurrencyCode ? rawCurrencyCode.toUpperCase() : null
    if (currencyCode && !/^[A-Z]{3}$/.test(currencyCode)) return null
    if ((amountMinor === null) !== (currencyCode === null)) return null

    const expiresAt = optionalDateTime(value.expiresAt)
    if (expiresAt === invalid) return null

    return {
        type: value.type,
        title,
        description,
        discountPercent,
        couponCode: value.type === 'discount' ? couponCode : null,
        amountMinor,
        currencyCode,
        expiresAt,
    }
}
