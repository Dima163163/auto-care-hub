import { randomBytes } from 'node:crypto'
import { In, IsNull } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveBookingMode,
    AutomotiveReviewEntity,
    AutomotiveReviewPromoEntity,
    AutomotiveReviewPromoStatus,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
} from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
import { assertAutoCareProviderLogoFileName, readAutoCareProviderLogo, saveAutoCareProviderLogo as persistAutoCareProviderLogo } from './autocare-provider-logo-storage.js'
import { saveAutoCareProviderMedia as persistAutoCareProviderMedia, type AutoCareProviderMediaKind } from './autocare-provider-media-storage.js'
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { canManageProvider, getManagedProviderScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { getRecommendedScore } from './autocare-ranking.js'
import { getDiscoverySlot } from './autocare-discovery.js'
import { findFallbackMarket, getFallbackServiceDefinitions, getFallbackZones, toFallbackMarketResponse } from './autocare-catalog-fallback.js'
import { AUTOMOTIVE_MOCK_MARKETS } from './autocare-mock-catalog.js'
import { toDiscoveryResponse, toLocationZoneResponse, toMarketResponse, toOfferResponse, toProviderResponse, toServiceDefinitionResponse } from './autocare.mappers.js'
import type { AutoCareDiscoveryQuery, AutoCareDiscoveryResponse, AutoCareProviderProfileResponse, AutoCareProviderReviewsResponse, AutoCareReviewPromoResponse, CreateAutoCareReviewInput, CreateAutoCareReviewPromoInput, OwnerAutoCareProviderInput, OwnerAutoCareProviderReviewsResponse, OwnerAutoCareReviewsResponse, RedeemAutoCareReviewPromoInput, UpdateAutoCareReviewInput } from './autocare.types.js'

function assertProviderActive(provider: AutomotiveProviderEntity | null): asserts provider is AutomotiveProviderEntity {
    if (!provider || provider.status !== AutomotiveProviderStatus.Active) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider not found.' })
    }
}

function assertOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only owners can manage automotive service profiles.' })
    }
}

function isAutoCareReviewUniqueError(error: unknown) {
    const driverError = (error as { driverError?: { code?: unknown; constraint?: unknown } }).driverError
    return driverError?.code === '23505' && driverError.constraint === 'UQ_autocare_reviews_service_request'
}

function getDistanceKm(latitude: number | null, longitude: number | null, marketLatitude = 55.7558, marketLongitude = 37.6173) {
    if (latitude === null || longitude === null) return Number.MAX_SAFE_INTEGER
    const latDistance = (latitude - marketLatitude) * 111
    const lngDistance = (longitude - marketLongitude) * 111 * Math.cos((marketLatitude * Math.PI) / 180)
    return Math.sqrt((latDistance ** 2) + (lngDistance ** 2))
}

function getBoundingBox(centerLatitude: number, centerLongitude: number, radiusKm: number) {
    const latDelta = radiusKm / 111
    const longitudeScale = Math.max(0.01, Math.cos((centerLatitude * Math.PI) / 180))
    const longitudeDelta = radiusKm / (111 * longitudeScale)
    return {
        minLatitude: centerLatitude - latDelta,
        maxLatitude: centerLatitude + latDelta,
        minLongitude: centerLongitude - longitudeDelta,
        maxLongitude: centerLongitude + longitudeDelta,
    }
}

// Keep the public discovery endpoint bounded even when a market contains a
// very large number of service points. All user-facing filters are applied in
// SQL before this guard; the remaining ranking step only sees a bounded set.
const MAX_DISCOVERY_CANDIDATES = 5_000

type DiscoverySortMode = NonNullable<AutoCareDiscoveryQuery['sort']>
type DiscoverySortValues = { primary: number; secondary: number; providerId: string; locationId: string }

function discoverySortValues(row: { provider: AutomotiveProviderEntity; location: AutomotiveServiceLocationEntity; offer: AutomotiveServiceOfferingEntity; distanceKm: number; nextSlot: string | null }, sort: DiscoverySortMode): DiscoverySortValues {
    if (sort === 'price_asc') return { primary: row.offer.priceFromMinor, secondary: Number(row.provider.rating), providerId: row.provider.id, locationId: row.location.id }
    if (sort === 'rating_desc') return { primary: Number(row.provider.rating), secondary: row.offer.priceFromMinor, providerId: row.provider.id, locationId: row.location.id }
    if (sort === 'distance_asc') return { primary: row.distanceKm, secondary: Number(row.provider.rating), providerId: row.provider.id, locationId: row.location.id }
    return {
        primary: getRecommendedScore({
            rating: Number(row.provider.rating),
            trustScore: Number(row.provider.trustScore),
            reviewCount: Number(row.provider.reviewCount),
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

function isReviewEditable(review: AutomotiveReviewEntity, now = new Date()) {
    return Boolean(review.revisionAllowedUntil && review.revisionAllowedUntil > now && !review.revisionUsedAt)
}

function toAutoCareReviewResponse(review: AutomotiveReviewEntity, options: { exposeActions?: boolean } = {}) {
    const exposeActions = options.exposeActions ?? false
    return {
        id: review.id,
        providerId: review.providerId,
        authorName: review.authorName,
        vehicleLabel: review.vehicleLabel,
        rating: review.rating,
        text: review.text,
        avatarUrl: review.avatarUrl,
        photoUrls: review.photoUrls,
        createdAt: review.createdAt.toISOString(),
        serviceRequestId: review.serviceRequestId,
        serviceSlug: review.serviceSlug,
        revisionAllowedUntil: review.revisionAllowedUntil?.toISOString() ?? null,
        revisionUsedAt: review.revisionUsedAt?.toISOString() ?? null,
        canContact: exposeActions && Boolean(review.serviceRequestId),
        canEdit: exposeActions && isReviewEditable(review),
    }
}

function toAutoCareReviewPromoResponse(promo: AutomotiveReviewPromoEntity): AutoCareReviewPromoResponse {
    return {
        id: promo.id,
        reviewId: promo.reviewId,
        providerId: promo.providerId,
        serviceRequestId: promo.serviceRequestId,
        serviceSlug: promo.serviceSlug,
        code: promo.code,
        discountPercent: promo.discountPercent,
        status: promo.status,
        expiresAt: promo.expiresAt.toISOString(),
        redeemedAt: promo.redeemedAt?.toISOString() ?? null,
    }
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
    const markets = await AppDataSource.getRepository(AutomotiveMarketEntity).find({ order: { countryName: 'ASC', cityName: 'ASC' } })
    // Keep the real API usable before the optional demo seed has been run. The
    // fallback is read-only and is only used when the table is empty; once the
    // database has catalog data it remains the sole source of truth.
    return markets.length > 0
        ? markets.map(toMarketResponse)
        : AUTOMOTIVE_MOCK_MARKETS.map(toFallbackMarketResponse)
}

export async function getAutoCareLocationZones(marketValue: string, parentId?: string, coordinates?: { latitude: number; longitude: number }, limit = 24) {
    const market = await findMarket(marketValue)
    if (!market) {
        const fallbackMarket = findFallbackMarket(marketValue)
        if (!fallbackMarket) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
        return getFallbackZones(fallbackMarket, { coordinates, limit }).filter((zone) => !parentId || zone.parentId === parentId)
    }

    const zoneRepository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const zones = await zoneRepository.find({
        where: { marketId: market.id, parentId: parentId ?? IsNull(), active: true },
        order: { displayOrder: 'ASC', slug: 'ASC' },
        take: coordinates ? undefined : limit,
    })
    if (zones.length === 0) {
        const fallbackMarket = findFallbackMarket(market.cityCode)
        return fallbackMarket
            ? getFallbackZones(fallbackMarket, { coordinates, limit }).filter((zone) => !parentId || zone.parentId === parentId)
            : []
    }

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

export async function getAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    return readAutoCareProviderLogo(fileName)
}

export async function saveAutoCareProviderLogo(_owner: UserEntity, content: Buffer) {
    assertOwner(_owner)
    return { url: await persistAutoCareProviderLogo(content) }
}

export async function saveAutoCareProviderMedia(owner: UserEntity, kind: AutoCareProviderMediaKind, content: Buffer) {
    assertOwner(owner)
    return { url: await persistAutoCareProviderMedia(kind, content) }
}

export async function getFeaturedAutoCareReviews(limit: number) {
    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        where: { status: AutomotiveReviewStatus.Approved },
        order: { createdAt: 'DESC' },
        take: limit,
    })

    return reviews.map((review) => toAutoCareReviewResponse(review))
}

export async function getAutoCareDiscovery(input: AutoCareDiscoveryQuery): Promise<AutoCareDiscoveryResponse> {
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
    const definition = input.serviceId
        ? await findServiceDefinition(input.serviceId)
        : (await definitionRepository.find({ where: { active: true }, take: 1 }))[0]
    if (!definition) return { items: [], nextCursor: null }
    const market = input.marketId ? await findMarket(input.marketId) : null
    // A selected market is a hard scope. Returning all locations when an unknown
    // market code is supplied would leak another region's providers and diverge
    // from the mock discovery contract, which returns an empty result instead.
    if (input.marketId && !market) return { items: [], nextCursor: null }
    // Stock postgres is used in local and staging Docker, so use the
    // portable indexed bounding-box strategy here. The exact distance check
    // below remains the source of truth and PostGIS can replace this query
    // without changing the API contract later.
    const marketLatitude = Number(market?.centerLatitude ?? 55.7558)
    const marketLongitude = Number(market?.centerLongitude ?? 37.6173)
    const box = market ? getBoundingBox(marketLatitude, marketLongitude, input.radiusKm) : null
    const distanceExpression = '6371 * acos(least(1, greatest(-1, cos(radians(:marketLatitude)) * cos(radians(location.latitude)) * cos(radians(location.longitude) - radians(:marketLongitude)) + sin(radians(:marketLatitude)) * sin(radians(location.latitude)))))'
    if (input.priceType && definition.priceType !== input.priceType) return { items: [], nextCursor: null }

    const candidateQuery = locationRepository
        .createQueryBuilder('location')
        .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = location.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
        .innerJoin(AutomotiveServiceOfferingEntity, 'offer', 'offer.locationId = location.id AND offer.definitionId = :definitionId AND offer.active = true', { definitionId: definition.id })
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
    if (input.minPrice !== undefined) locationQuery.andWhere('offer.priceFromMinor >= :minPriceMinor', { minPriceMinor: Math.round(input.minPrice * 100) })
    if (input.maxPrice !== undefined) locationQuery.andWhere('offer.priceFromMinor <= :maxPriceMinor', { maxPriceMinor: Math.round(input.maxPrice * 100) })
    if (input.minRating !== undefined) locationQuery.andWhere('provider.rating >= :minRating', { minRating: input.minRating })
    if (input.verifiedOnly) locationQuery.andWhere('provider.verified = true')
    if (input.warrantyOnly) locationQuery.andWhere('offer."warrantyText" IS NOT NULL')
    if (input.hasBonus) locationQuery.andWhere('provider."bonusSummary" IS NOT NULL')
    if (input.brandId) locationQuery.andWhere('(provider."isMultibrand" = true OR provider."brandSpecializations" @> ARRAY[:brandId]::text[])', { brandId: input.brandId })
    const candidates = await locationQuery.getRawMany<{ locationId: string }>()
    const locationIds = candidates.map((candidate) => candidate.locationId)
    if (locationIds.length === 0) return { items: [], nextCursor: null }
    const locations = await locationRepository.find({ where: { id: In(locationIds) } })
    const [offers, providers] = await Promise.all([
        offerRepository.find({ where: { definitionId: definition.id, active: true, locationId: In(locationIds) } }),
        providerRepository.find({ where: { status: AutomotiveProviderStatus.Active, id: In([...new Set(locations.map((location) => location.providerId))]) }, order: { id: 'ASC' } }),
    ])
    const offerByLocation = new Map(offers.map((offer) => [offer.locationId, offer]))
    const providerById = new Map(providers.map((provider) => [provider.id, provider]))
    const rows = locations.flatMap((location) => {
        const provider = providerById.get(location.providerId)
        const offer = offerByLocation.get(location.id)
        if (!provider || !offer) return []
        const matchesProvider = !input.providerName || provider.name.toLowerCase().includes(input.providerName.toLowerCase())
        const distanceKm = market ? getDistanceKm(location.latitude, location.longitude, marketLatitude, marketLongitude) : 0
        const price = offer.priceFromMinor / 100
        const matchesPrice = (input.minPrice === undefined || price >= input.minPrice) && (input.maxPrice === undefined || price <= input.maxPrice)
        const matchesRating = input.minRating === undefined || Number(provider.rating) >= input.minRating
        const matchesType = input.priceType === undefined || definition.priceType === input.priceType
        const discoverySlot = getDiscoverySlot(location, market)
        const matchesAvailableToday = !input.availableToday || discoverySlot.availableToday
        const matchesVerified = !input.verifiedOnly || provider.verified
        const matchesWarranty = !input.warrantyOnly || Boolean(offer.warrantyText)
        const matchesBonus = !input.hasBonus || Boolean(provider.bonusSummary)
        const matchesInclusion = !input.inclusion || offer.inclusions.some((item) => item.toLowerCase().includes(input.inclusion!.toLowerCase()))
        const matchesBrand = !input.brandId || provider.isMultibrand || provider.brandSpecializations.includes(input.brandId)
        const matchesDistance = !market || distanceKm <= input.radiusKm
        return matchesProvider && matchesDistance && matchesPrice && matchesRating && matchesType && matchesAvailableToday && matchesVerified && matchesWarranty && matchesBonus && matchesInclusion && matchesBrand ? [{ provider, location, offer, distanceKm, definition, nextSlot: discoverySlot.nextSlot }] : []
    })
    const sorted = rows.sort((left, right) => compareDiscoveryValues(discoverySortValues(left, sort), discoverySortValues(right, sort), sort))
        .filter((row) => !cursorValues || compareDiscoveryValues(discoverySortValues(row, sort), cursorValues, sort) > 0)
    const page = sorted.slice(0, limit + 1)
    const hasMore = page.length > limit
    const items = page.slice(0, limit).map((row) => toDiscoveryResponse(row))
    const lastRow = page.at(limit - 1)
    const lastValues = lastRow ? discoverySortValues(lastRow, sort) : null
    return {
        items,
        nextCursor: hasMore && lastValues
            ? encodeCursor({ sort, primary: String(lastValues.primary), secondary: String(lastValues.secondary), providerId: lastValues.providerId, locationId: lastValues.locationId })
            : null,
    }
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

export async function updateOwnerAutoCareOffer(owner: UserEntity, providerId: string, offerId: string, input: { description: string | null; priceFromMinor: number; bookingMode?: 'request' | 'instant' }) {
    assertOwner(owner)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    if (!provider || provider.status === AutomotiveProviderStatus.Suspended) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })

    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const offering = await offeringRepository.findOne({ where: { id: offerId, active: true } })
    if (!offering) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service offer not found.' })
    if (!(await canManageProvider(owner.id, provider.id, offering.locationId))) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service offer not found.' })

    const definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findOneBy({ id: offering.definitionId })
    if (!definition) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service definition not found.' })

    offering.description = input.description
    offering.priceFromMinor = input.priceFromMinor
    if (input.bookingMode) offering.bookingMode = input.bookingMode === 'instant' ? AutomotiveBookingMode.Instant : AutomotiveBookingMode.Request
    if (offering.priceToMinor !== null && offering.priceToMinor < input.priceFromMinor) offering.priceToMinor = input.priceFromMinor
    const savedOffering = await offeringRepository.save(offering)
    return toOfferResponse(savedOffering, definition)
}

export async function getOwnerAutoCareProviders(owner: UserEntity) {
    assertOwner(owner)
    const scopes = await getManagedProviderScopes(owner.id)
    const providerIds = scopes.map(({ providerId }) => providerId)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) }, order: { createdAt: 'DESC' } })
    if (providers.length === 0) return []

    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const locations = await locationRepository.findBy({ providerId: In(providers.map((provider) => provider.id)) })
    const visibleLocations = locations.filter((location) => isManagedProviderLocationAllowed(scopes, location.providerId, location.id))
    const locationByProviderId = new Map(visibleLocations.map((location) => [location.providerId, location]))
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const offers = visibleLocations.length === 0
        ? []
        : await offeringRepository.find({ where: { locationId: In(visibleLocations.map((location) => location.id)), active: true }, order: { priceFromMinor: 'ASC' } })
    const definitionIds = [...new Set(offers.map((offer) => offer.definitionId))]
    const definitions = definitionIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findBy({ id: In(definitionIds) })
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]))
    const offersByLocationId = new Map<string, AutomotiveServiceOfferingEntity[]>()
    for (const offer of offers) {
        const locationOffers = offersByLocationId.get(offer.locationId) ?? []
        locationOffers.push(offer)
        offersByLocationId.set(offer.locationId, locationOffers)
    }

    return providers.flatMap((provider) => {
        const location = locationByProviderId.get(provider.id)
        if (!location) return []
        return [{
            ...toProviderResponse(provider, location),
            offers: (offersByLocationId.get(location.id) ?? []).map((offer) => toOfferResponse(offer, definitionById.get(offer.definitionId))),
        }]
    })
}

async function filterReviewsByRequestLocations(reviews: AutomotiveReviewEntity[], locationIds: string[]) {
    if (reviews.length === 0 || locationIds.length === 0) return []
    const requestIds = reviews.flatMap((review) => review.serviceRequestId ? [review.serviceRequestId] : [])
    if (requestIds.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({
        where: { id: In(requestIds), locationId: In(locationIds) },
        select: { id: true },
    })
    const visibleRequestIds = new Set(requests.map((request) => request.id))
    return reviews.filter((review) => Boolean(review.serviceRequestId && visibleRequestIds.has(review.serviceRequestId)))
}

export async function getOwnerAutoCareProviderReviews(owner: UserEntity, providerId: string): Promise<OwnerAutoCareProviderReviewsResponse> {
    assertOwner(owner)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    const scopes = await getManagedProviderScopes(owner.id)
    const scope = scopes.find((item) => item.providerId === providerId)
    if (!provider || provider.status === AutomotiveProviderStatus.Suspended || !scope) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })

    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        where: { providerId: provider.id, status: AutomotiveReviewStatus.Approved },
        order: { createdAt: 'DESC' },
    })
    const visibleReviews = scope?.locationIds === null
        ? reviews
        : await filterReviewsByRequestLocations(reviews, scope?.locationIds ?? [])
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const review of visibleReviews) distribution[String(review.rating) as keyof typeof distribution]++
    const totalReviews = visibleReviews.length
    const averageRating = totalReviews === 0 ? 0 : Number((visibleReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))

    return {
        providerId: provider.id,
        totalReviews,
        averageRating,
        distribution,
        reviews: visibleReviews.map((review) => toAutoCareReviewResponse(review, { exposeActions: true })),
    }
}

export async function getAutoCareProviderReviews(providerId: string, limit = 20): Promise<AutoCareProviderReviewsResponse> {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    assertProviderActive(provider)

    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        where: { providerId: provider.id, status: AutomotiveReviewStatus.Approved },
        order: { createdAt: 'DESC' },
    })
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const review of reviews) distribution[String(review.rating) as keyof typeof distribution]++
    const totalReviews = reviews.length
    const averageRating = totalReviews === 0 ? 0 : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))

    return {
        providerId: provider.id,
        totalReviews,
        averageRating,
        distribution,
        reviews: reviews.slice(0, limit).map((review) => toAutoCareReviewResponse(review)),
    }
}

export async function getOwnerAutoCareReviews(owner: UserEntity, providerId?: string): Promise<OwnerAutoCareReviewsResponse> {
    assertOwner(owner)
    const providers = await getOwnerAutoCareProviders(owner)
    const selectedProviders = providerId
        ? providers.filter((provider) => provider.id === providerId)
        : providers
    if (providerId && selectedProviders.length === 0) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    }

    const providerIds = selectedProviders.map((provider) => provider.id)
    const reviews = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveReviewEntity).find({
            where: { providerId: In(providerIds), status: AutomotiveReviewStatus.Approved },
            order: { createdAt: 'DESC' },
        })
    const scopes = await getManagedProviderScopes(owner.id)
    const visibleReviews = (await Promise.all(scopes.map(async (scope) => {
        const providerReviews = reviews.filter((review) => review.providerId === scope.providerId)
        return scope.locationIds === null ? providerReviews : filterReviewsByRequestLocations(providerReviews, scope.locationIds)
    }))).flat()
    const providerById = new Map(selectedProviders.map((provider) => [provider.id, provider]))
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const review of visibleReviews) distribution[String(review.rating) as keyof typeof distribution]++
    const totalReviews = visibleReviews.length

    return {
        selectedProviderId: providerId ?? null,
        providers: providers.map((provider) => ({ id: provider.id, name: provider.name, address: provider.location.address, rating: provider.rating, reviewCount: provider.reviewCount })),
        totalReviews,
        averageRating: totalReviews === 0 ? 0 : Number((visibleReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)),
        distribution,
        reviews: visibleReviews.flatMap((review) => {
            const provider = providerById.get(review.providerId)
            if (!provider) return []
            return [{ ...toAutoCareReviewResponse(review, { exposeActions: true }), providerName: provider.name, providerAddress: provider.location.address }]
        }),
    }
}

function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can manage automotive review revisions.' })
    }
}

function makeReviewPromoCode() {
    return `CARE-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function createOwnerAutoCareReviewPromo(owner: UserEntity, providerId: string, reviewId: string, input: CreateAutoCareReviewPromoInput): Promise<AutoCareReviewPromoResponse> {
    assertOwner(owner)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    const review = await AppDataSource.getRepository(AutomotiveReviewEntity).findOneBy({ id: reviewId, providerId, status: AutomotiveReviewStatus.Approved })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive review not found.' })
    const request = review.serviceRequestId
        ? await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: review.serviceRequestId, providerId })
        : null
    if (!provider || !(await canManageProvider(owner.id, providerId, request?.locationId ?? null))) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    if (!review.clientId) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This review is not linked to a client account yet.' })

    const promoRepository = AppDataSource.getRepository(AutomotiveReviewPromoEntity)
    let code = makeReviewPromoCode()
    while (await promoRepository.existsBy({ code })) code = makeReviewPromoCode()
    const promo = promoRepository.create({
        providerId,
        reviewId,
        clientId: review.clientId,
        serviceRequestId: review.serviceRequestId,
        serviceSlug: input.serviceSlug ?? review.serviceSlug,
        code,
        discountPercent: input.discountPercent,
        status: AutomotiveReviewPromoStatus.Active,
        expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1_000),
        redeemedAt: null,
        redeemedById: null,
    })
    const savedPromo = await promoRepository.save(promo)
    await enqueueNotificationSafely({
        userId: review.clientId,
        category: NotificationCategory.Booking,
        title: 'Сервис предложил решение по отзыву',
        message: `Промокод ${savedPromo.code} даёт скидку ${savedPromo.discountPercent}% на следующий визит.`,
        link: `/profile/reviews?autocarePromo=${savedPromo.code}`,
        metadata: { domain: 'autocare', reviewId, promoId: savedPromo.id },
    }, `notification:autocare-review-promo:${savedPromo.id}`)
    return toAutoCareReviewPromoResponse(savedPromo)
}

export async function redeemAutoCareReviewPromo(client: UserEntity, input: RedeemAutoCareReviewPromoInput): Promise<AutoCareReviewPromoResponse> {
    assertClient(client)
    return AppDataSource.transaction(async (manager) => {
        const promoRepository = manager.getRepository(AutomotiveReviewPromoEntity)
        const promo = await promoRepository.findOne({ where: { code: input.code }, lock: { mode: 'pessimistic_write' } })
        if (!promo || promo.clientId !== client.id) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Promo code not found.' })
        if (promo.status !== AutomotiveReviewPromoStatus.Active) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This promo code has already been used or revoked.' })
        if (promo.expiresAt <= new Date()) {
            promo.status = AutomotiveReviewPromoStatus.Expired
            await promoRepository.save(promo)
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This promo code has expired.' })
        }

        const now = new Date()
        promo.status = AutomotiveReviewPromoStatus.Redeemed
        promo.redeemedAt = now
        promo.redeemedById = client.id
        const reviewRepository = manager.getRepository(AutomotiveReviewEntity)
        const review = await reviewRepository.findOneBy({ id: promo.reviewId, clientId: client.id })
        if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Review linked to this promo was not found.' })
        review.revisionAllowedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000)
        review.revisionUsedAt = null
        await reviewRepository.save(review)
        return toAutoCareReviewPromoResponse(await promoRepository.save(promo))
    })
}

export async function getMyAutoCareReviews(client: UserEntity) {
    assertClient(client)
    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({ where: { clientId: client.id }, order: { createdAt: 'DESC' } })
    return reviews.map((review) => toAutoCareReviewResponse(review, { exposeActions: true }))
}

/**
 * Create exactly one verified review for a confirmed AutoCare request.
 * The request row is locked so two browser retries cannot create duplicate reviews.
 */
export async function createAutoCareReview(client: UserEntity, input: CreateAutoCareReviewInput) {
    assertClient(client)
    let review: AutomotiveReviewEntity
    try {
        review = await AppDataSource.transaction(async (manager) => {
            const requestRepository = manager.getRepository(ServiceRequestEntity)
            const request = await requestRepository.findOne({
                where: { id: input.requestId, clientId: client.id },
                lock: { mode: 'pessimistic_write' },
            })
            if (!request) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Service request not found.' })
            const confirmed = request.clientConfirmedAt && request.providerConfirmedAt
            if (!confirmed || request.status !== ServiceRequestStatus.Closed) {
                throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A completed and confirmed visit is required before leaving a review.' })
            }

            const reviewRepository = manager.getRepository(AutomotiveReviewEntity)
            const existing = await reviewRepository.findOneBy({ serviceRequestId: request.id })
            if (existing) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This service visit already has a review.' })

            const vehicle = request.vehicleSnapshot ?? {}
            const vehicleLabel = [vehicle.make, vehicle.model, vehicle.year]
                .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
                .join(' ') || 'Автомобиль'
            return reviewRepository.save(reviewRepository.create({
                providerId: request.providerId,
                authorName: client.name,
                vehicleLabel,
                rating: input.rating,
                text: input.text,
                avatarUrl: client.avatarUrl,
                photoUrls: [],
                clientId: client.id,
                serviceRequestId: request.id,
                verifiedVisit: true,
                serviceSlug: request.offeringSnapshot?.serviceSlug ?? null,
                status: AutomotiveReviewStatus.Pending,
            }))
        })
    } catch (error) {
        if (isAutoCareReviewUniqueError(error)) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This service visit already has a review.' })
        }
        throw error
    }
    return toAutoCareReviewResponse(review, { exposeActions: true })
}

export async function updateClientAutoCareReview(client: UserEntity, reviewId: string, input: UpdateAutoCareReviewInput) {
    assertClient(client)
    const repository = AppDataSource.getRepository(AutomotiveReviewEntity)
    const review = await repository.findOneBy({ id: reviewId, clientId: client.id })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive review not found.' })
    if (!isReviewEditable(review)) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This review can only be edited after redeeming a valid service promo code.' })
    review.rating = input.rating
    review.text = input.text
    review.status = AutomotiveReviewStatus.Pending
    review.revisionUsedAt = new Date()
    const savedReview = await repository.save(review)
    return toAutoCareReviewResponse(savedReview, { exposeActions: true })
}

export async function createOwnerAutoCareProvider(owner: UserEntity, input: OwnerAutoCareProviderInput) {
    assertOwner(owner)
    const market = await AppDataSource.getRepository(AutomotiveMarketEntity).findOneBy({ id: input.marketId })
    if (!market) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })
    const zone = input.zoneId
        ? await AppDataSource.getRepository(AutomotiveLocationZoneEntity).findOneBy({ id: input.zoneId, marketId: market.id, active: true })
        : null
    if (input.zoneId && !zone) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'The selected service zone does not belong to this market.' })

    const phones = [...new Set((input.phones ?? []).map((phone) => phone.trim()).filter(Boolean))]
    if (phones.length === 0 && input.phone?.trim()) phones.push(input.phone.trim())

    return AppDataSource.transaction(async (manager) => {
        const provider = await manager.getRepository(AutomotiveProviderEntity).save(manager.getRepository(AutomotiveProviderEntity).create({
            ownerId: owner.id,
            name: input.name,
            description: input.description ?? null,
            status: AutomotiveProviderStatus.Draft,
            verified: false,
            yearsActive: input.yearsActive,
            staffCount: input.staffCount,
            workstationCount: input.workstationCount ?? 0,
            phone: phones[0] ?? input.phone ?? null,
            phones,
            email: input.email ?? null,
            websiteUrl: input.websiteUrl ?? null,
            metroStation: input.metroStation ?? null,
            warrantyText: input.warrantyText ?? null,
            bonusSummary: input.bonusSummary ?? null,
            logoUrl: input.logoUrl ?? null,
            coverImageUrl: input.coverImageUrl ?? null,
            galleryImageUrls: [...new Set(input.galleryImageUrls ?? [])],
            amenityIds: [...new Set(input.amenityIds)],
            brandSpecializations: [...new Set(input.brandSpecializations)],
            isMultibrand: input.isMultibrand,
        }))
        const location = await manager.getRepository(AutomotiveServiceLocationEntity).save(manager.getRepository(AutomotiveServiceLocationEntity).create({
            providerId: provider.id,
            marketId: market.id,
            zoneId: zone?.id ?? null,
            address: input.address,
            hours: input.hours,
            timezone: input.timezone ?? market.timezone,
            weeklySchedule: input.weeklySchedule ?? undefined,
            blackoutDates: input.blackoutDates ?? [],
            latitude: null,
            longitude: null,
        }))
        await manager.getRepository(AutomotiveProviderMembershipEntity).save(manager.getRepository(AutomotiveProviderMembershipEntity).create({
            providerId: provider.id,
            userId: owner.id,
            locationId: null,
            role: AutomotiveProviderMembershipRole.Owner,
        }))

        return toProviderResponse(provider, location)
    })
}
