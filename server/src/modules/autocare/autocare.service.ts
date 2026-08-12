import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
import { toDiscoveryResponse, toMarketResponse, toOfferResponse, toProviderResponse, toServiceDefinitionResponse } from './autocare.mappers.js'
import type { AutoCareDiscoveryQuery, AutoCareDiscoveryResponse, AutoCareProviderProfileResponse } from './autocare.types.js'

function assertProviderActive(provider: AutomotiveProviderEntity | null): asserts provider is AutomotiveProviderEntity {
    if (!provider || provider.status !== AutomotiveProviderStatus.Active) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider not found.' })
    }
}

function getDistanceKm(latitude: number | null, longitude: number | null, marketLatitude = 55.7558, marketLongitude = 37.6173) {
    if (latitude === null || longitude === null) return Number.MAX_SAFE_INTEGER
    const latDistance = (latitude - marketLatitude) * 111
    const lngDistance = (longitude - marketLongitude) * 111 * Math.cos((marketLatitude * Math.PI) / 180)
    return Math.sqrt((latDistance ** 2) + (lngDistance ** 2))
}

async function findServiceDefinition(value: string) {
    const repository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const bySlug = await repository.findOneBy({ slug: value })
    if (bySlug) return bySlug
    return /^[0-9a-f-]{36}$/i.test(value) ? repository.findOneBy({ id: value }) : null
}

async function findMarket(value: string) {
    const repository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const byCityCode = await repository.findOneBy({ cityCode: value })
    if (byCityCode) return byCityCode
    const cityCode = value.split('-').at(-1)
    if (cityCode) {
        const byMarketCode = await repository.findOneBy({ cityCode })
        if (byMarketCode) return byMarketCode
    }
    return /^[0-9a-f-]{36}$/i.test(value) ? repository.findOneBy({ id: value }) : null
}

export async function getAutoCareMarkets() {
    return (await AppDataSource.getRepository(AutomotiveMarketEntity).find({ order: { countryName: 'ASC', cityName: 'ASC' } })).map(toMarketResponse)
}

export async function getAutoCareServiceDefinitions() {
    return (await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ where: { active: true }, order: { categorySlug: 'ASC', slug: 'ASC' } })).map(toServiceDefinitionResponse)
}

export async function getAutoCareDiscovery(input: AutoCareDiscoveryQuery): Promise<AutoCareDiscoveryResponse> {
    const limit = getCursorLimit(input.limit)
    const cursor = input.cursor ? decodeCursor(input.cursor, ['providerId']) : null
    const definitionRepository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const offerRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const definition = input.serviceId
        ? await findServiceDefinition(input.serviceId)
        : (await definitionRepository.find({ where: { active: true }, take: 1 }))[0]
    if (!definition) return { items: [], nextCursor: null }
    const market = input.marketId ? await findMarket(input.marketId) : null
    const locations = await locationRepository.find({ where: market ? { marketId: market.id } : undefined, order: { id: 'ASC' } })
    const locationIds = locations.map((location) => location.id)
    if (locationIds.length === 0) return { items: [], nextCursor: null }
    const offers = await offerRepository.find({ where: { definitionId: definition.id, active: true } })
    const offerByLocation = new Map(offers.filter((offer) => locationIds.includes(offer.locationId)).map((offer) => [offer.locationId, offer]))
    const providers = await providerRepository.find({ where: { status: AutomotiveProviderStatus.Active }, order: { id: 'ASC' } })
    const providerById = new Map(providers.map((provider) => [provider.id, provider]))
    const rows = locations.flatMap((location) => {
        const provider = providerById.get(location.providerId)
        const offer = offerByLocation.get(location.id)
        if (!provider || !offer) return []
        const distanceKm = getDistanceKm(location.latitude, location.longitude)
        const price = offer.priceFromMinor / 100
        const matchesPrice = (input.minPrice === undefined || price >= input.minPrice) && (input.maxPrice === undefined || price <= input.maxPrice)
        const matchesRating = input.minRating === undefined || Number(provider.rating) >= input.minRating
        const matchesType = input.priceType === undefined || definition.priceType === input.priceType
        const matchesVerified = !input.verifiedOnly || provider.verified
        const matchesWarranty = !input.warrantyOnly || Boolean(offer.warrantyText)
        const matchesBonus = !input.hasBonus || Boolean(provider.bonusSummary)
        const matchesInclusion = !input.inclusion || offer.inclusions.some((item) => item.toLowerCase().includes(input.inclusion!.toLowerCase()))
        const matchesBrand = !input.brandId || provider.isMultibrand || provider.brandSpecializations.includes(input.brandId)
        return distanceKm <= input.radiusKm && matchesPrice && matchesRating && matchesType && matchesVerified && matchesWarranty && matchesBonus && matchesInclusion && matchesBrand ? [{ provider, location, offer, distanceKm, definition }] : []
    })
    const sorted = rows.sort((left, right) => {
        if (input.sort === 'price_asc') return left.offer.priceFromMinor - right.offer.priceFromMinor
        if (input.sort === 'rating_desc') return Number(right.provider.rating) - Number(left.provider.rating)
        if (input.sort === 'distance_asc') return left.distanceKm - right.distanceKm
        return (Number(right.provider.rating) - Number(left.provider.rating)) || (left.offer.priceFromMinor - right.offer.priceFromMinor)
    }).filter((row) => !cursor || row.provider.id > (cursor.providerId ?? ''))
    const page = sorted.slice(0, limit + 1)
    const hasMore = page.length > limit
    const items = page.slice(0, limit).map((row) => toDiscoveryResponse(row))
    return { items, nextCursor: hasMore && items.at(-1) ? encodeCursor({ providerId: items.at(-1)!.provider.id }) : null }
}

export async function getAutoCareProviderProfile(providerId: string): Promise<AutoCareProviderProfileResponse> {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    assertProviderActive(provider)
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ providerId: provider.id })
    if (!location) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider location not found.' })
    const offers = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ where: { locationId: location.id, active: true }, order: { priceFromMinor: 'ASC' } })
    const definitions = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findByIds(offers.map((offer) => offer.definitionId))
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]))
    return {
        ...toProviderResponse(provider, location),
        coverImageUrl: provider.coverImageUrl,
        offers: offers.map((offer) => toOfferResponse(offer, definitionById.get(offer.definitionId))),
    }
}

export async function getAutoCareProviderOffers(providerId: string, serviceId?: string) {
    const profile = await getAutoCareProviderProfile(providerId)
    if (!serviceId) return profile.offers
    const definition = await findServiceDefinition(serviceId)
    return definition ? profile.offers.filter((offer) => offer.serviceDefinitionId === definition.id) : []
}
