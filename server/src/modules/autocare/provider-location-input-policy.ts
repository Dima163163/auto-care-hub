import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

export type NormalizedAutoCareProviderLocationIds = {
    marketId: string | null
    zoneId: string | null
}

/**
 * Owner provider creation is normally guarded by the route schema, but the
 * service is also called directly by seeds, tests and replay handlers. Keep
 * persisted market/zone references canonical before any repository lookup;
 * free-form country/city onboarding intentionally returns a null market id.
 */
export function normalizeAutoCareProviderLocationIds(input: unknown): NormalizedAutoCareProviderLocationIds | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const hasMarketId = value.marketId !== undefined && value.marketId !== null && value.marketId !== ''
    const marketId = hasMarketId ? normalizeProviderMembershipUuid(value.marketId) : null
    if (hasMarketId && !marketId) return null
    const zoneId = value.zoneId === undefined || value.zoneId === null ? null : normalizeProviderMembershipUuid(value.zoneId)
    if (value.zoneId !== undefined && value.zoneId !== null && !zoneId) return null
    if (!marketId && zoneId) return null
    return { marketId, zoneId }
}
