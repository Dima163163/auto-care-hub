import { autoCareProviders } from './mock-fixtures'

export function toMockAutoCareFavorite(providerId: string, userId: string) {
    const provider = autoCareProviders.find((item) => item.id === providerId)
    if (!provider) return null
    return {
        id: `favorite-${userId}-${provider.id}`,
        providerId: provider.id,
        locationId: provider.location.id,
        createdAt: '2026-08-14T08:00:00.000Z',
        provider,
        offer: provider.offers?.[0] ?? null,
    }
}
