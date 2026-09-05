import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

export type NormalizedAutoCareProviderLocationIds = {
    marketId: string
    zoneId: string | null
}

/**
 * Owner provider creation is normally guarded by the route schema, but the
 * service is also called directly by seeds, tests and replay handlers. Keep
 * market/zone references canonical before any repository lookup.
 */
export function normalizeAutoCareProviderLocationIds(input: unknown): NormalizedAutoCareProviderLocationIds | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const marketId = normalizeProviderMembershipUuid(value.marketId)
    if (!marketId) return null
    const zoneId = value.zoneId === undefined || value.zoneId === null ? null : normalizeProviderMembershipUuid(value.zoneId)
    if (value.zoneId !== undefined && value.zoneId !== null && !zoneId) return null
    return { marketId, zoneId }
}
