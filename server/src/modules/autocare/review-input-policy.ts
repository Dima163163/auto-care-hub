import type { CreateAutoCareReviewPromoInput, RedeemAutoCareReviewPromoInput } from './autocare.types.js'
import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const reviewPromoCodePattern = /^CARE-[A-Z0-9]{8}$/

function normalizeBoundedText(value: unknown, min: number, max: number) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= min && normalized.length <= max ? normalized : null
}

export function normalizeAutoCareReviewUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareReviewPromoInput(input: unknown): CreateAutoCareReviewPromoInput & { serviceSlug: string | null; expiresInDays: number } | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !['discountPercent', 'serviceSlug', 'expiresInDays'].includes(key))) return null
    if (typeof value.discountPercent !== 'number' || !Number.isSafeInteger(value.discountPercent) || value.discountPercent < 1 || value.discountPercent > 100) return null
    const serviceSlug = value.serviceSlug === undefined || value.serviceSlug === null ? null : normalizeBoundedText(value.serviceSlug, 1, 120)
    if (value.serviceSlug !== undefined && value.serviceSlug !== null && !serviceSlug) return null
    const expiresInDays = value.expiresInDays === undefined ? 30 : value.expiresInDays
    if (typeof expiresInDays !== 'number' || !Number.isSafeInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) return null
    return { discountPercent: value.discountPercent, serviceSlug, expiresInDays }
}

export function normalizeAutoCareReviewPromoCode(value: unknown): RedeemAutoCareReviewPromoInput | null {
    if (typeof value !== 'string') return null
    const code = value.normalize('NFKC').trim().toUpperCase()
    return reviewPromoCodePattern.test(code) ? { code } : null
}
