import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const datePattern = /^\d{4}-\d{2}-\d{2}$/

export function normalizeAutoCareAvailabilityUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareAvailabilityDate(value: unknown) {
    if (typeof value !== 'string') return null
    const date = value.normalize('NFKC').trim()
    if (!datePattern.test(date)) return null
    const timestamp = Date.parse(`${date}T00:00:00.000Z`)
    if (!Number.isFinite(timestamp)) return null
    return new Date(timestamp).toISOString().slice(0, 10) === date ? date : null
}
