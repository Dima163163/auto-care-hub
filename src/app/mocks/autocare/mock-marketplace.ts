import type { User } from "@/entities/user"
import { getScopedMockBroadcastResponse } from ".././broadcast-access-policy"
import { hasMockProviderPermission } from './mock-access'
import { autoCareMarkets, ownerAutoCareProviders, superAdminMarketCountries } from './mock-fixtures'

export function getMockBroadcastResponse(user: User, item: Record<string, unknown>) {
    const providers = ownerAutoCareProviders.filter((provider) => provider.status === 'active'
        && hasMockProviderPermission(user.id, provider.id, 'requests', provider.location.id))
    const market = autoCareMarkets.find((candidate) => candidate.id === item.marketId)
    const publicMarket = Boolean(market?.launchReady && superAdminMarketCountries.some((country) => country.code === market.countryCode && country.active))
    return getScopedMockBroadcastResponse(user.id, item, providers, publicMarket, Date.now())
}
