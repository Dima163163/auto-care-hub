import { randomBytes } from 'node:crypto'
import { In, IsNull } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewPromoEntity,
    AutomotiveReviewPromoStatus,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
import { assertAutoCareProviderLogoFileName, readAutoCareProviderLogo, saveAutoCareProviderLogo as persistAutoCareProviderLogo } from './autocare-provider-logo-storage.js'
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { toDiscoveryResponse, toLocationZoneResponse, toMarketResponse, toOfferResponse, toProviderResponse, toServiceDefinitionResponse } from './autocare.mappers.js'
import type { AutoCareDiscoveryQuery, AutoCareDiscoveryResponse, AutoCareProviderProfileResponse, AutoCareReviewPromoResponse, CreateAutoCareReviewPromoInput, OwnerAutoCareProviderInput, OwnerAutoCareProviderReviewsResponse, OwnerAutoCareReviewsResponse, RedeemAutoCareReviewPromoInput, UpdateAutoCareReviewInput } from './autocare.types.js'

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

function getDistanceKm(latitude: number | null, longitude: number | null, marketLatitude = 55.7558, marketLongitude = 37.6173) {
    if (latitude === null || longitude === null) return Number.MAX_SAFE_INTEGER
    const latDistance = (latitude - marketLatitude) * 111
    const lngDistance = (longitude - marketLongitude) * 111 * Math.cos((marketLatitude * Math.PI) / 180)
    return Math.sqrt((latDistance ** 2) + (lngDistance ** 2))
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
    return (await AppDataSource.getRepository(AutomotiveMarketEntity).find({ order: { countryName: 'ASC', cityName: 'ASC' } })).map(toMarketResponse)
}

export async function getAutoCareLocationZones(marketValue: string, parentId?: string, coordinates?: { latitude: number; longitude: number }, limit = 24) {
    const market = await findMarket(marketValue)
    if (!market) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive market not found.' })

    const zoneRepository = AppDataSource.getRepository(AutomotiveLocationZoneEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const zones = await zoneRepository.find({
        where: { marketId: market.id, parentId: parentId ?? IsNull(), active: true },
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
    return (await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ where: { active: true }, order: { categorySlug: 'ASC', slug: 'ASC' } })).map(toServiceDefinitionResponse)
}

export async function getAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    return readAutoCareProviderLogo(fileName)
}

export async function saveAutoCareProviderLogo(_owner: UserEntity, content: Buffer) {
    assertOwner(_owner)
    return { url: await persistAutoCareProviderLogo(content) }
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
    const locations = await locationRepository.find({ where: market ? { marketId: market.id, ...(input.zoneId ? { zoneId: input.zoneId } : {}) } : undefined, order: { id: 'ASC' } })
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
        const distanceKm = getDistanceKm(location.latitude, location.longitude, Number(market?.centerLatitude ?? 55.7558), Number(market?.centerLongitude ?? 37.6173))
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

export async function updateOwnerAutoCareOffer(owner: UserEntity, providerId: string, offerId: string, input: { description: string | null; priceFromMinor: number }) {
    assertOwner(owner)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId, ownerId: owner.id })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })

    const locations = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findBy({ providerId: provider.id })
    if (locations.length === 0) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service location not found.' })

    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const offering = await offeringRepository.findOne({ where: { id: offerId, locationId: In(locations.map((location) => location.id)), active: true } })
    if (!offering) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service offer not found.' })

    const definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findOneBy({ id: offering.definitionId })
    if (!definition) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service definition not found.' })

    offering.description = input.description
    offering.priceFromMinor = input.priceFromMinor
    if (offering.priceToMinor !== null && offering.priceToMinor < input.priceFromMinor) offering.priceToMinor = input.priceFromMinor
    const savedOffering = await offeringRepository.save(offering)
    return toOfferResponse(savedOffering, definition)
}

export async function getOwnerAutoCareProviders(owner: UserEntity) {
    assertOwner(owner)
    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { ownerId: owner.id }, order: { createdAt: 'DESC' } })
    if (providers.length === 0) return []

    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const locations = await locationRepository.findBy({ providerId: In(providers.map((provider) => provider.id)) })
    const locationByProviderId = new Map(locations.map((location) => [location.providerId, location]))
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const offers = locations.length === 0
        ? []
        : await offeringRepository.find({ where: { locationId: In(locations.map((location) => location.id)), active: true }, order: { priceFromMinor: 'ASC' } })
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

export async function getOwnerAutoCareProviderReviews(owner: UserEntity, providerId: string): Promise<OwnerAutoCareProviderReviewsResponse> {
    assertOwner(owner)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId, ownerId: owner.id })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })

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
        reviews: reviews.map((review) => toAutoCareReviewResponse(review, { exposeActions: true })),
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
    const providerById = new Map(selectedProviders.map((provider) => [provider.id, provider]))
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const review of reviews) distribution[String(review.rating) as keyof typeof distribution]++
    const totalReviews = reviews.length

    return {
        selectedProviderId: providerId ?? null,
        providers: providers.map((provider) => ({ id: provider.id, name: provider.name, address: provider.location.address, rating: provider.rating, reviewCount: provider.reviewCount })),
        totalReviews,
        averageRating: totalReviews === 0 ? 0 : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)),
        distribution,
        reviews: reviews.flatMap((review) => {
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
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId, ownerId: owner.id })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    const review = await AppDataSource.getRepository(AutomotiveReviewEntity).findOneBy({ id: reviewId, providerId, status: AutomotiveReviewStatus.Approved })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive review not found.' })
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

    return AppDataSource.transaction(async (manager) => {
        const provider = await manager.getRepository(AutomotiveProviderEntity).save(manager.getRepository(AutomotiveProviderEntity).create({
            ownerId: owner.id,
            name: input.name,
            description: input.description ?? null,
            status: AutomotiveProviderStatus.Draft,
            verified: false,
            yearsActive: input.yearsActive,
            staffCount: input.staffCount,
            logoUrl: input.logoUrl ?? null,
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
            latitude: null,
            longitude: null,
        }))

        return toProviderResponse(provider, location)
    })
}
