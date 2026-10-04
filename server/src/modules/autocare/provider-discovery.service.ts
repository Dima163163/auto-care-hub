import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveMarketEntity, AutomotiveMarketCountryEntity, AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity } from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
import { getRecommendedScore } from './autocare-ranking.js'
import { getDiscoverySlot } from './autocare-discovery.js'
import { isRolloutEnabled } from './rollout-controls.js'
import { env } from '../../config/env.js'
import { ENABLED_AUTOCARE_COUNTRY_CODES } from '../../config/enabled-market-countries.js'
import { recordAutoCareProviderDiscoveryImpressions } from './autocare-analytics.service.js'
import { getDiscoveryCache, getDiscoveryCacheKey, setDiscoveryCache } from './discovery-cache.js'
import { getAutoCareTrustRollout } from '../admin/super-admin-trust-policy.service.js'
import { getPublicAutoCareReviewSummaries } from './autocare-review-summary.js'
import { toDiscoveryResponse } from './autocare.mappers.js'
import { normalizeAutoCareDiscoveryQuery } from './discovery-input-policy.js'
import type { AutoCareDiscoveryQuery, AutoCareDiscoveryResponse } from './autocare.types.js'
import { getBoundingBox, getDistanceKm } from './discovery-geo.js'
import { findMarket, findServiceDefinition, getPublicAutoCareMarketIds } from './public-market-access.service.js'

// Keep the public discovery endpoint bounded even when a market contains a
// very large number of service points. All user-facing filters are applied in
// SQL before this guard; the remaining ranking step only sees a bounded set.
const MAX_DISCOVERY_CANDIDATES = 5_000

type DiscoverySortMode = NonNullable<AutoCareDiscoveryQuery['sort']>

type DiscoverySortValues = { primary: number; secondary: number; providerId: string; locationId: string }

function discoverySortValues(row: { provider: AutomotiveProviderEntity; location: AutomotiveServiceLocationEntity; offer: AutomotiveServiceOfferingEntity; distanceKm: number; nextSlot: string | null; rating: number; reviewCount: number }, sort: DiscoverySortMode): DiscoverySortValues {
    if (sort === 'price_asc') return { primary: row.offer.priceFromMinor, secondary: row.rating, providerId: row.provider.id, locationId: row.location.id }
    if (sort === 'rating_desc') return { primary: row.rating, secondary: row.offer.priceFromMinor, providerId: row.provider.id, locationId: row.location.id }
    if (sort === 'distance_asc') return { primary: row.distanceKm, secondary: row.rating, providerId: row.provider.id, locationId: row.location.id }
    return {
        primary: getRecommendedScore({
            rating: row.rating,
            trustScore: Number(row.provider.trustScore),
            reviewCount: row.reviewCount,
            verified: row.provider.verified,
            distanceKm: row.distanceKm,
            // The selected definition and brand filter already guarantee a
            // compatible match. The remaining signals come from the offer and
            // the location schedule so organic ranking stays observable.
            serviceRelevance: 1,
            vehicleRelevance: 1,
            availabilityScore: row.nextSlot ? 1 : 0.25,
            priceCompleteness: row.offer.priceToMinor !== null
                ? 1
                : row.offer.inclusions.length > 0 || Boolean(row.offer.description)
                    ? 0.75
                    : 0.5,
        }),
        secondary: row.offer.priceFromMinor,
        providerId: row.provider.id,
        locationId: row.location.id,
    }
}

function compareDiscoveryValues(left: DiscoverySortValues, right: DiscoverySortValues, sort: DiscoverySortMode) {
    const primary = sort === 'rating_desc' || sort === 'recommended'
        ? right.primary - left.primary
        : left.primary - right.primary
    if (primary !== 0) return primary
    const secondary = sort === 'rating_desc' || sort === 'recommended'
        ? left.secondary - right.secondary
        : right.secondary - left.secondary
    return secondary || left.providerId.localeCompare(right.providerId) || left.locationId.localeCompare(right.locationId)
}

export async function getAutoCareDiscovery(input: AutoCareDiscoveryQuery): Promise<AutoCareDiscoveryResponse> {
    const normalizedInput = normalizeAutoCareDiscoveryQuery(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Discovery query is invalid.' })
    input = normalizedInput
    const limit = getCursorLimit(input.limit)
    const sort = input.sort ?? 'recommended'
    const cursor = input.cursor ? decodeCursor(input.cursor, ['sort', 'primary', 'secondary', 'providerId', 'locationId']) : null
    if (cursor && cursor.sort !== sort) {
        throw new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message: 'Cursor does not match the selected sort.' })
    }
    const cursorValues: DiscoverySortValues | null = cursor
        ? { primary: Number(cursor.primary), secondary: Number(cursor.secondary), providerId: cursor.providerId ?? '', locationId: cursor.locationId ?? '' }
        : null
    if (cursorValues && (!cursorValues.providerId || !cursorValues.locationId || !Number.isFinite(cursorValues.primary) || !Number.isFinite(cursorValues.secondary))) {
        throw new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message: 'Cursor is invalid or expired.' })
    }
    const definitionRepository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const offerRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    // An omitted service is an intentional unscoped discovery request. Do not
    // silently replace it with the first catalog definition: that would hide
    // providers which only publish other services. The representative offer
    // is selected after the location query below.
    const definition = input.serviceId ? await findServiceDefinition(input.serviceId) : null
    if (input.serviceId && !definition) return emptyAutoCareDiscoveryResponse()
    const market = input.marketId ? await findMarket(input.marketId) : null
    const launchReadyMarkets = await AppDataSource.getRepository(AutomotiveMarketEntity).find({
        where: { launchReady: true },
        select: { id: true, countryId: true, countryCode: true, launchReady: true },
    })
    const publicMarketIds = await getPublicAutoCareMarketIds(launchReadyMarkets)
    const launchReadyMarketIds = [...publicMarketIds].sort()
    const launchReadyMarketIdSet = new Set(launchReadyMarketIds)
    // A selected market is a hard scope. Unknown/unlaunched markets return a
    // safe empty response; unscoped discovery remains limited to launch-ready
    // markets in the database predicate below.
    if (launchReadyMarketIds.length === 0 || (input.marketId && (!market || !launchReadyMarketIdSet.has(market.id)))) {
        return emptyAutoCareDiscoveryResponse()
    }
    const cacheEnabled = env.nodeEnv !== 'test'
    const cacheKey = cacheEnabled
        ? `${getDiscoveryCacheKey(input)}&launchReadyMarkets=${launchReadyMarketIds.join(',')}`
        : null
    const cachedResponse = cacheKey ? getDiscoveryCache(cacheKey) : null
    if (cachedResponse) {
        void recordAutoCareProviderDiscoveryImpressions(cachedResponse.items.map((item) => item.provider.id))
        return cachedResponse
    }
    // Stock postgres is used in local and staging Docker, so use the
    // portable indexed bounding-box strategy here. The exact distance check
    // below remains the source of truth and PostGIS can replace this query
    // without changing the API contract later.
    const marketLatitude = Number(market?.centerLatitude ?? 55.7558)
    const marketLongitude = Number(market?.centerLongitude ?? 37.6173)
    const box = market ? getBoundingBox(marketLatitude, marketLongitude, input.radiusKm) : null
    const distanceExpression = '6371 * acos(least(1, greatest(-1, cos(radians(:marketLatitude)) * cos(radians(location.latitude)) * cos(radians(location.longitude) - radians(:marketLongitude)) + sin(radians(:marketLatitude)) * sin(radians(location.latitude)))))'
    if (input.priceType && definition && definition.priceType !== input.priceType) return emptyAutoCareDiscoveryResponse()

    const offerJoinCondition = input.serviceId
        ? 'offer.locationId = location.id AND offer.definitionId = :definitionId AND offer.active = true'
        : 'offer.locationId = location.id AND offer.active = true'

    const candidateQuery = locationRepository
        .createQueryBuilder('location')
        .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:enabledCountryCodes)', { enabledCountryCodes: [...ENABLED_AUTOCARE_COUNTRY_CODES] })
        .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
        .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = location.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
        .innerJoin(AutomotiveServiceOfferingEntity, 'offer', offerJoinCondition, input.serviceId ? { definitionId: definition!.id } : {})
        .select('location.id', 'locationId')
        .addSelect('offer.priceFromMinor', 'priceFromMinor')
        .addSelect('provider.rating', 'providerRating')
        .addSelect('location.latitude', 'latitude')
        .addSelect('location.longitude', 'longitude')
        .orderBy(sort === 'price_asc' ? 'offer.priceFromMinor' : sort === 'rating_desc' ? 'provider.rating' : sort === 'distance_asc' && market ? distanceExpression : 'provider.rating', sort === 'rating_desc' ? 'DESC' : 'ASC')
        .addOrderBy('location.id', 'ASC')
        .take(MAX_DISCOVERY_CANDIDATES)
    const locationQuery = candidateQuery
    if (market) locationQuery.andWhere('location.marketId = :marketId', { marketId: market.id })
    if (input.zoneId) locationQuery.andWhere('location.zoneId = :zoneId', { zoneId: input.zoneId })
    if (box) {
        locationQuery
            .andWhere('location.latitude BETWEEN :minLatitude AND :maxLatitude', box)
            .andWhere('location.longitude BETWEEN :minLongitude AND :maxLongitude', box)
    }
    if (market) {
        // Keep the broad bbox index-friendly prefilter, then apply the exact
        // great-circle distance in SQL so pagination never materializes rows
        // outside the requested radius. The JS check below mirrors this for
        // deterministic response mapping and non-Postgres test doubles.
        locationQuery.andWhere(`${distanceExpression} <= :radiusKm`, {
            marketLatitude,
            marketLongitude,
            radiusKm: input.radiusKm,
        })
    }
    if (input.providerName) locationQuery.andWhere('LOWER(provider.name) LIKE :providerName', { providerName: `%${input.providerName.toLowerCase()}%` })
    // With a selected service these predicates can be pushed into SQL. For an
    // unscoped request they are evaluated against every offer for a location
    // after loading the small bounded candidate set, so one non-matching
    // offer cannot hide a different matching service.
    if (input.serviceId && input.minPrice !== undefined) locationQuery.andWhere('offer.priceFromMinor >= :minPriceMinor', { minPriceMinor: Math.round(input.minPrice * 100) })
    if (input.serviceId && input.maxPrice !== undefined) locationQuery.andWhere('offer.priceFromMinor <= :maxPriceMinor', { maxPriceMinor: Math.round(input.maxPrice * 100) })
    if (input.verifiedOnly) locationQuery.andWhere('provider.verified = true')
    if (input.warrantyOnly) locationQuery.andWhere('offer."warrantyText" IS NOT NULL')
    if (input.hasBonus) locationQuery.andWhere('provider."bonusSummary" IS NOT NULL')
    if (input.brandId) locationQuery.andWhere('(provider."isMultibrand" = true OR provider."brandSpecializations" @> ARRAY[:brandId]::text[])', { brandId: input.brandId })
    const candidates = await locationQuery.getRawMany<{ locationId: string }>()
    const locationIds = [...new Set(candidates.map((candidate) => candidate.locationId))]
    if (locationIds.length === 0) return emptyAutoCareDiscoveryResponse()
    const locations = await locationRepository.find({ where: { id: In(locationIds) } })
    const [offers, providers] = await Promise.all([
        offerRepository.find({ where: { ...(definition ? { definitionId: definition.id } : {}), active: true, locationId: In(locationIds) } }),
        providerRepository.find({ where: { status: AutomotiveProviderStatus.Active, id: In([...new Set(locations.map((location) => location.providerId))]) }, order: { id: 'ASC' } }),
    ])
    const definitions = await definitionRepository.findByIds([...new Set(offers.map((offer) => offer.definitionId))])
    const definitionById = new Map(definitions.map((item) => [item.id, item]))
    const offersByLocation = new Map<string, AutomotiveServiceOfferingEntity[]>()
    for (const offer of offers) {
        const locationOffers = offersByLocation.get(offer.locationId) ?? []
        locationOffers.push(offer)
        offersByLocation.set(offer.locationId, locationOffers)
    }
    const providerById = new Map(providers.map((provider) => [provider.id, provider]))
    const providerIds = providers.map((provider) => provider.id)
    const publicReviewSummaries = await getPublicAutoCareReviewSummaries(providerIds)
    const rows = locations.flatMap((location) => {
        const provider = providerById.get(location.providerId)
        const locationOffers = offersByLocation.get(location.id) ?? []
        const matchingOffers = locationOffers.filter((offer) => {
            const offerDefinition = definitionById.get(offer.definitionId)
            const price = offer.priceFromMinor / 100
            return (input.minPrice === undefined || price >= input.minPrice)
                && (input.maxPrice === undefined || price <= input.maxPrice)
                && (!input.priceType || offerDefinition?.priceType === input.priceType)
                && (!input.warrantyOnly || Boolean(offer.warrantyText))
                && (!input.inclusion || offer.inclusions.some((item) => item.toLowerCase().includes(input.inclusion!.toLowerCase())))
        })
        // Keep one row per service location while still allowing an
        // unscoped search to match any of its published services. The lowest
        // starting price is a stable representative for the card and map.
        const offer = matchingOffers.slice().sort((left, right) => left.priceFromMinor - right.priceFromMinor)[0]
        if (!provider || !offer) return []
        const rowDefinition = definitionById.get(offer.definitionId) ?? definition ?? undefined
        const matchesProvider = !input.providerName || provider.name.toLowerCase().includes(input.providerName.toLowerCase())
        const reviewSummary = publicReviewSummaries.get(provider.id) ?? { rating: 0, reviewCount: 0 }
        const distanceKm = market ? getDistanceKm(location.latitude, location.longitude, marketLatitude, marketLongitude) : 0
        const price = offer.priceFromMinor / 100
        const matchesPrice = (input.minPrice === undefined || price >= input.minPrice) && (input.maxPrice === undefined || price <= input.maxPrice)
        const matchesRating = input.minRating === undefined || reviewSummary.rating >= input.minRating
        const matchesType = !input.priceType || rowDefinition?.priceType === input.priceType
        const discoverySlot = getDiscoverySlot(location, market)
        const matchesAvailableToday = !input.availableToday || discoverySlot.availableToday
        const matchesVerified = !input.verifiedOnly || provider.verified
        const matchesWarranty = !input.warrantyOnly || Boolean(offer.warrantyText)
        const matchesBonus = !input.hasBonus || Boolean(provider.bonusSummary)
        const matchesInclusion = !input.inclusion || offer.inclusions.some((item) => item.toLowerCase().includes(input.inclusion!.toLowerCase()))
        const matchesBrand = !input.brandId || provider.isMultibrand || provider.brandSpecializations.includes(input.brandId)
        const matchesDistance = !market || distanceKm <= input.radiusKm
        return matchesProvider && matchesDistance && matchesPrice && matchesRating && matchesType && matchesAvailableToday && matchesVerified && matchesWarranty && matchesBonus && matchesInclusion && matchesBrand ? [{ provider, location, offer, distanceKm, definition: rowDefinition, nextSlot: discoverySlot.nextSlot, ...reviewSummary }] : []
    })
    const allSorted = rows.sort((left, right) => compareDiscoveryValues(discoverySortValues(left, sort), discoverySortValues(right, sort), sort))
    const totalCount = allSorted.length
    const totalCountIsLowerBound = candidates.length >= MAX_DISCOVERY_CANDIDATES
    const sorted = allSorted.filter((row) => !cursorValues || compareDiscoveryValues(discoverySortValues(row, sort), cursorValues, sort) > 0)
    const page = sorted.slice(0, limit + 1)
    const hasMore = page.length > limit
    const trustRollout = await getAutoCareTrustRollout()
    const items = page.slice(0, limit).map((row) => toDiscoveryResponse({
        ...row,
        rating: row.rating,
        reviewCount: row.reviewCount,
        trustEnabled: isRolloutEnabled(trustRollout, {
            marketId: market?.id ?? null,
            subjectKey: row.provider.id,
        }),
    }))
    const lastRow = page.at(limit - 1)
    const lastValues = lastRow ? discoverySortValues(lastRow, sort) : null
    void recordAutoCareProviderDiscoveryImpressions(items.map((item) => item.provider.id))
    const response = {
        items,
        totalCount,
        totalCountIsLowerBound,
        nextCursor: hasMore && lastValues
            ? encodeCursor({ sort, primary: String(lastValues.primary), secondary: String(lastValues.secondary), providerId: lastValues.providerId, locationId: lastValues.locationId })
            : null,
    }
    if (cacheKey) setDiscoveryCache(cacheKey, response)
    return response
}

function emptyAutoCareDiscoveryResponse(): AutoCareDiscoveryResponse {
    return { items: [], nextCursor: null, totalCount: 0, totalCountIsLowerBound: false }
}
