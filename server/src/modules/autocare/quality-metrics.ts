import type { AutomotiveBookingMode, AutomotivePriceType } from '../../entities/automotive/automotive.entity.js'
import { AutomotiveProviderMembershipStatus } from '../../entities/automotive/provider-membership.entity.js'
import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'

export type QualityProvider = { id: string; status: string; ownerId?: string | null }
export type QualityProviderMembership = { providerId: string; userId: string; locationId: string | null; status: string }
export type QualityDefinition = { id: string; active: boolean }
export type QualityLocation = { id: string; providerId: string; marketId: string }
export type QualityOffer = {
    locationId: string
    definitionId: string
    active: boolean
    description?: string | null
    priceFromMinor: number
    priceToMinor: number | null
    currencyCode: string
    priceType?: AutomotivePriceType
    bookingMode?: AutomotiveBookingMode
}
export type QualityRequest = {
    id: string
    clientId: string
    providerId: string
    locationId: string
    status: ServiceRequestStatus
    createdAt: Date
    clientConfirmedAt: Date | null
    providerConfirmedAt: Date | null
}
export type QualityMessage = { requestId: string | null; senderId: string; kind?: string; createdAt: Date }

export type AutoCareCatalogQualityMetrics = {
    activeDefinitions: number
    activeOffers: number
    providersWithOffers: number
    offerCoveragePercent: number
    offersWithDescription: number
    offersWithPrice: number
    priceCoveragePercent: number
}

export type AutoCareSupplyQualityMetrics = {
    markets: Array<{ marketId: string; providers: number; locations: number; activeOffers: number }>
    activeMarkets: number
    averageLocationsPerProvider: number
}

export type AutoCareReliabilityQualityMetrics = {
    responseSamples: number
    averageResponseMinutes: number | null
    p95ResponseMinutes: number | null
    confirmedBookings: number
    confirmationSamples: number
    confirmationReliabilityPercent: number
    bookingConflicts: number
}

function percent(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
}

function percentile(values: number[], percentileValue: number) {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)
    const value = sorted[Math.max(0, index)]
    return value === undefined ? null : Number(value.toFixed(1))
}

export function buildQualityMetrics(input: {
    providers: QualityProvider[]
    providerMemberships: QualityProviderMembership[]
    definitions: QualityDefinition[]
    locations: QualityLocation[]
    offers: QualityOffer[]
    requests: QualityRequest[]
    messages: QualityMessage[]
}): {
    catalog: AutoCareCatalogQualityMetrics
    supply: AutoCareSupplyQualityMetrics
    reliability: AutoCareReliabilityQualityMetrics
} {
    const activeProviders = input.providers.filter((provider) => provider.status === 'active')
    const activeOffers = input.offers.filter((offer) => offer.active)
    const locationById = new Map(input.locations.map((location) => [location.id, location]))
    const providerIdsWithOffers = new Set(activeOffers.map((offer) => locationById.get(offer.locationId)?.providerId).filter((id): id is string => Boolean(id)))
    const responseMinutes: number[] = []
    const firstProviderMessage = new Map<string, Date>()
    const providerById = new Map(input.providers.map((provider) => [provider.id, provider]))
    const membershipsByProvider = new Map<string, QualityProviderMembership[]>()
    for (const membership of input.providerMemberships) {
        const memberships = membershipsByProvider.get(membership.providerId) ?? []
        memberships.push(membership)
        membershipsByProvider.set(membership.providerId, memberships)
    }
    const requestById = new Map(input.requests.map((request) => [request.id, request]))
    for (const message of input.messages) {
        if (!message.requestId || firstProviderMessage.has(message.requestId) || message.kind === 'system') continue
        const request = requestById.get(message.requestId)
        const provider = request ? providerById.get(request.providerId) : undefined
        if (!request || !provider || message.senderId === request.clientId) continue
        const providerAuthored = provider.ownerId === message.senderId || (membershipsByProvider.get(request.providerId) ?? []).some((membership) => (
            membership.status === AutomotiveProviderMembershipStatus.Active
            && membership.userId === message.senderId
            && (membership.locationId === null || membership.locationId === request.locationId)
        ))
        if (providerAuthored) firstProviderMessage.set(message.requestId, message.createdAt)
    }
    for (const request of input.requests) {
        const firstReply = firstProviderMessage.get(request.id)
        if (firstReply) responseMinutes.push(Math.max(0, (firstReply.getTime() - request.createdAt.getTime()) / 60_000))
    }
    const confirmationSamples = input.requests.filter((request) => request.providerConfirmedAt || request.clientConfirmedAt)
    const confirmedBookings = input.requests.filter((request) => request.providerConfirmedAt && request.clientConfirmedAt).length
    const bookingConflicts = input.requests.filter((request) => request.status === ServiceRequestStatus.Declined || request.status === ServiceRequestStatus.Cancelled).length
    const markets = new Map<string, { providers: Set<string>; locations: Set<string>; activeOffers: number }>()
    for (const location of input.locations) {
        const row = markets.get(location.marketId) ?? { providers: new Set<string>(), locations: new Set<string>(), activeOffers: 0 }
        row.providers.add(location.providerId)
        row.locations.add(location.id)
        markets.set(location.marketId, row)
    }
    for (const offer of activeOffers) {
        const marketId = locationById.get(offer.locationId)?.marketId
        if (marketId) markets.get(marketId)!.activeOffers += 1
    }
    const providerCount = activeProviders.length
    return {
        catalog: {
            activeDefinitions: input.definitions.filter((definition) => definition.active).length,
            activeOffers: activeOffers.length,
            providersWithOffers: providerIdsWithOffers.size,
            offerCoveragePercent: percent(providerIdsWithOffers.size, providerCount),
            offersWithDescription: activeOffers.filter((offer) => Boolean(offer.description?.trim())).length,
            offersWithPrice: activeOffers.filter((offer) => Number.isFinite(offer.priceFromMinor)).length,
            priceCoveragePercent: percent(activeOffers.filter((offer) => Number.isFinite(offer.priceFromMinor)).length, activeOffers.length),
        },
        supply: {
            markets: [...markets.entries()].map(([marketId, row]) => ({ marketId, providers: row.providers.size, locations: row.locations.size, activeOffers: row.activeOffers })).sort((a, b) => a.marketId.localeCompare(b.marketId)),
            activeMarkets: markets.size,
            averageLocationsPerProvider: providerCount === 0 ? 0 : Number((input.locations.length / providerCount).toFixed(1)),
        },
        reliability: {
            responseSamples: responseMinutes.length,
            averageResponseMinutes: responseMinutes.length === 0 ? null : Number((responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length).toFixed(1)),
            p95ResponseMinutes: percentile(responseMinutes, 95),
            confirmedBookings,
            confirmationSamples: confirmationSamples.length,
            confirmationReliabilityPercent: percent(confirmedBookings, confirmationSamples.length),
            bookingConflicts,
        },
    }
}
