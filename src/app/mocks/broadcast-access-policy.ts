import type { AutoCareApiProvider } from '@/entities/automotive-service'

export function isMockBroadcastOffer(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function getScopedMockBroadcastResponse(userId: string, item: Record<string, unknown>, providers: readonly AutoCareApiProvider[], publicMarket: boolean, nowMs: number) {
    const { clientId: _clientId, ...response } = item
    const offers = Array.isArray(item.offers) ? item.offers.filter(isMockBroadcastOffer) : []
    if (item.clientId === userId) return response
    if (!providers.length) return null
    const ownOffers = offers.filter((offer) => providers.some((provider) => offer.providerId === provider.id
        && offer.locationId === provider.location.id
        && (!item.marketId || item.marketId === provider.location.marketId)))
    const matchingService = providers.some((provider) => provider.location.marketId === item.marketId
        && provider.offers?.some((offering) => offering.active && offering.serviceDefinitionId === item.serviceDefinitionId))
    if (!ownOffers.length && !(item.status === 'open' && Date.parse(String(item.expiresAt)) > nowMs && publicMarket && matchingService)) return null
    return { ...response, offers: ownOffers }
}

