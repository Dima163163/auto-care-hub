import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

export function normalizeAutoCarePublicProviderUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCarePublicReviewLimit(value: unknown, fallback: number) {
    const candidate = value === undefined ? fallback : value
    return typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0 && candidate <= 50 ? candidate : null
}

export function normalizeAutoCarePublicServiceId(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= 1 && normalized.length <= 120 ? normalized : null
}
