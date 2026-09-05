import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const maxFavoriteProviders = 100

export function normalizeAutoCareFavoriteProviderUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareFavoriteLocationUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareFavoriteProviderIds(value: unknown) {
    if (!Array.isArray(value) || value.length > maxFavoriteProviders) return null
    const ids: string[] = []
    for (const item of value) {
        const providerId = normalizeAutoCareFavoriteProviderUuid(item)
        if (!providerId) return null
        if (!ids.includes(providerId)) ids.push(providerId)
    }
    return ids
}
