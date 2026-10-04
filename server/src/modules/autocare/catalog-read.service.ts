import { IsNull } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveMarketEntity, AutomotiveLocationZoneEntity, AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity } from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAutoCareCountryEnabled } from '../../config/enabled-market-countries.js'
import { findFallbackMarket, getFallbackServiceDefinitions, getFallbackZones, toFallbackMarketResponse } from './autocare-catalog-fallback.js'
import { AUTOMOTIVE_MOCK_MARKETS } from './autocare-mock-catalog.js'
import { toLocationZoneResponse, toMarketResponse, toServiceDefinitionResponse } from './autocare.mappers.js'
import { normalizeAutoCarePublicServiceId } from './public-provider-input-policy.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'
import { getDistanceKm } from './discovery-geo.js'
import { findMarket, getPublicAutoCareMarketIds, isPublicAutoCareMarket } from './public-market-access.service.js'

export async function getAutoCareMarkets() {
    const markets = await AppDataSource.getRepository(AutomotiveMarketEntity).find({ order: { countryName: 'ASC', cityName: 'ASC' } })
    // Keep the real API usable before the optional demo seed has been run. The
    // fallback is read-only and is only used when the table is empty; once the
    // database has catalog data it remains the sole source of truth.
    if (markets.length > 0) {
        const publicMarketIds = await getPublicAutoCareMarketIds(markets)
        return markets.filter((market) => publicMarketIds.has(market.id)).map(toMarketResponse)
    }
    return AUTOMOTIVE_MOCK_MARKETS
        .filter((market) => market.launchReady && isAutoCareCountryEnabled(market.countryCode))
        .map(toFallbackMarketResponse)
}

export async function getAutoCareLocationZones(marketValue: string, parentId?: string, coordinates?: { latitude: number; longitude: number }, limit = 24) {
    const normalizedMarketValue = normalizeAutoCarePublicServiceId(marketValue)
    if (!normalizedMarketValue) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Market id must be a non-empty value up to 120 characters.' })
    const normalizedParentId = parentId === undefined ? undefined : normalizeAutoCareRequestUuid(parentId)
    if (parentId !== undefined && !normalizedParentId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Parent zone id must be a valid UUID.' })
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Zone limit must be an integer between 1 and 100.' })
    if (coordinates !== undefined && (!coordinates || typeof coordinates !== 'object' || Array.isArray(coordinates) || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) || coordinates.latitude < -90 || coordinates.latitude > 90 || coordinates.longitude < -180 || coordinates.longitude > 180)) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Zone coordinates are invalid.' })
    }
    const market = await findMarket(normalizedMarketValue)
    if (!market) {
        // Static catalog fallback is only a local empty-database bootstrap. If
        // the persisted catalog exists, an unknown market must not be mapped to
        // a similarly named mock city.
        if (await AppDataSource.getRepository(AutomotiveMarketEntity).count() > 0) return []
        const fallbackMarket = findFallbackMarket(normalizedMarketValue)
        if (!fallbackMarket) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
        return getFallbackZones(fallbackMarket, { coordinates, limit }).filter((zone) => !normalizedParentId || zone.parentId === normalizedParentId)
    }
    if (!(await isPublicAutoCareMarket(market))) return []

    const zoneRepository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const zones = await zoneRepository.find({
        where: { marketId: market.id, parentId: normalizedParentId ?? IsNull(), active: true },
        order: { displayOrder: 'ASC', slug: 'ASC' },
        take: coordinates ? undefined : limit,
    })
    if (zones.length === 0) return []

    const locations = await locationRepository.find({ where: { marketId: market.id } })
    const providers = await providerRepository.find({ where: { status: AutomotiveProviderStatus.Active } })
    const activeProviderIds = new Set(providers.map((provider) => provider.id))
    const counts = new Map<string, number>()
    for (const location of locations) {
        if (location.zoneId && activeProviderIds.has(location.providerId)) counts.set(location.zoneId, (counts.get(location.zoneId) ?? 0) + 1)
    }
    const orderedZones = coordinates
        ? zones.sort((left, right) => getDistanceKm(left.centerLatitude, left.centerLongitude, coordinates.latitude, coordinates.longitude) - getDistanceKm(right.centerLatitude, right.centerLongitude, coordinates.latitude, coordinates.longitude))
        : zones
    return orderedZones.slice(0, limit).map((zone) => toLocationZoneResponse(zone, counts.get(zone.id) ?? 0))
}

export async function getAutoCareServiceDefinitions() {
    const definitions = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ where: { active: true }, order: { categorySlug: 'ASC', slug: 'ASC' } })
    return definitions.length > 0 ? definitions.map(toServiceDefinitionResponse) : getFallbackServiceDefinitions()
}
