import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveMarketEntity, AutomotiveMarketCountryEntity, AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveReviewEntity, AutomotiveReviewStatus, AutomotiveServiceLocationEntity } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getManagedProviderPermissionScopes } from './provider-access.service.js'
import { ENABLED_AUTOCARE_COUNTRY_CODES } from '../../config/enabled-market-countries.js'
import { getPublicReviewCommunityData } from './autocare-community.service.js'
import { normalizeAutoCareReviewPhotoUrls } from './autocare-public-media-policy.js'
import { normalizeAutoCareReviewUuid } from './review-input-policy.js'
import { normalizeAutoCarePublicProviderUuid, normalizeAutoCarePublicReviewLimit } from './public-provider-input-policy.js'
import type { AutoCareProviderReviewsResponse, OwnerAutoCareProviderReviewsResponse, OwnerAutoCareReviewsResponse } from './autocare.types.js'
import { assertClient, assertProviderActive, throwNotFound } from './provider-guards.js'
import { getOwnerAutoCareProviders } from './provider-read.service.js'
import { filterReviewsByRequestLocations, summarizeAutoCareReviews, toAutoCareReviewResponse } from './provider-review-read-model.service.js'
import { getPublicProviderLocations } from './public-market-access.service.js'

export async function getFeaturedAutoCareReviews(limit: number) {
    const normalizedLimit = normalizeAutoCarePublicReviewLimit(limit, 6)
    if (!normalizedLimit) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Review limit must be an integer between 1 and 50.' })
    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity)
        .createQueryBuilder('review')
        .innerJoin(ServiceRequestEntity, 'request', 'request.id = review.serviceRequestId AND request.providerId = review.providerId')
        .innerJoin(AutomotiveServiceLocationEntity, 'location', 'location.id = request.locationId')
        .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:enabledCountryCodes)', { enabledCountryCodes: [...ENABLED_AUTOCARE_COUNTRY_CODES] })
        .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
        .where('review.status = :status', { status: AutomotiveReviewStatus.Approved })
        .andWhere('review.serviceRequestId IS NOT NULL')
        .andWhere('review.verifiedVisit = true')
        .andWhere('request.status = :requestStatus', { requestStatus: ServiceRequestStatus.Closed })
        .andWhere('request.clientConfirmedAt IS NOT NULL')
        .andWhere('request.providerConfirmedAt IS NOT NULL')
        .orderBy('review.createdAt', 'DESC')
        .addOrderBy('review.id', 'DESC')
        .take(normalizedLimit)
        .getMany()
    const providerIds = [...new Set(reviews.map((review) => review.providerId))]
    const providers = providerIds.length > 0
        ? await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } })
        : []
    const providerNames = new Map(providers.map((provider) => [provider.id, provider.name]))

    const communityData = await getPublicReviewCommunityData(reviews)
    return reviews.map((review) => {
        const community = communityData.get(review.id)
        return {
            id: review.id,
            providerId: review.providerId,
            authorName: community?.authorName ?? '',
            vehicleLabel: '',
            rating: review.rating,
            text: review.text,
            avatarUrl: community?.avatarUrl ?? null,
            photoUrls: normalizeAutoCareReviewPhotoUrls(review.photoUrls),
            createdAt: review.createdAt.toISOString(),
            serviceSlug: review.serviceSlug,
            communityProfile: community?.communityProfile ?? null,
            helpfulCount: community?.helpfulCount ?? 0,
            providerName: providerNames.get(review.providerId) ?? review.providerId,
        }
    })
}

export async function getOwnerAutoCareProviderReviews(owner: UserEntity, providerId: string): Promise<OwnerAutoCareProviderReviewsResponse> {
    const normalizedProviderId = normalizeAutoCareReviewUuid(providerId)
    if (!normalizedProviderId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    const scopes = await getManagedProviderPermissionScopes(owner.id, 'reviews')
    const scope = scopes.find((item) => item.providerId === normalizedProviderId)
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
    const normalizedProviderId = normalizeAutoCarePublicProviderUuid(providerId)
    if (!normalizedProviderId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    const normalizedLimit = normalizeAutoCarePublicReviewLimit(limit, 20)
    if (!normalizedLimit) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Review limit must be an integer between 1 and 50.' })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    assertProviderActive(provider)

    const locations = await getPublicProviderLocations(provider.id)
    if (locations.length === 0) throwNotFound('Automotive provider not found.')
    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        where: { providerId: provider.id, status: AutomotiveReviewStatus.Approved },
        order: { createdAt: 'DESC' },
    })
    const visibleReviews = await filterReviewsByRequestLocations(reviews, locations.map((location) => location.id), true)
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const review of visibleReviews) distribution[String(review.rating) as keyof typeof distribution]++
    const totalReviews = visibleReviews.length
    const averageRating = totalReviews === 0 ? 0 : Number((visibleReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))

    const publicReviews = visibleReviews.slice(0, normalizedLimit)
    const communityData = await getPublicReviewCommunityData(publicReviews)

    return {
        providerId: provider.id,
        totalReviews,
        averageRating,
        distribution,
        reviews: publicReviews.map((review) => {
            const community = communityData.get(review.id)
            return {
                id: review.id,
                providerId: review.providerId,
                authorName: community?.authorName ?? '',
                vehicleLabel: '',
                rating: review.rating,
                text: review.text,
                avatarUrl: community?.avatarUrl ?? null,
                photoUrls: normalizeAutoCareReviewPhotoUrls(review.photoUrls),
                createdAt: review.createdAt.toISOString(),
                serviceSlug: review.serviceSlug,
                communityProfile: community?.communityProfile ?? null,
                helpfulCount: community?.helpfulCount ?? 0,
            }
        }),
    }
}

export async function getOwnerAutoCareReviews(owner: UserEntity, providerId?: string): Promise<OwnerAutoCareReviewsResponse> {
    const normalizedProviderId = providerId === undefined ? undefined : normalizeAutoCareReviewUuid(providerId)
    if (providerId !== undefined && !normalizedProviderId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    const providers = await getOwnerAutoCareProviders(owner)
    const selectedProviders = normalizedProviderId
        ? providers.filter((provider) => provider.id === normalizedProviderId)
        : providers
    if (normalizedProviderId && selectedProviders.length === 0) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    }

    const scopes = await getManagedProviderPermissionScopes(owner.id, 'reviews')
    const allowedProviderIds = new Set(scopes.map((scope) => scope.providerId))
    const reviewProviders = selectedProviders.filter((provider) => allowedProviderIds.has(provider.id))
    if (normalizedProviderId && reviewProviders.length === 0) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    }
    const providerIds = reviewProviders.map((provider) => provider.id)
    const reviews = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveReviewEntity).find({
            where: { providerId: In(providerIds), status: AutomotiveReviewStatus.Approved },
            order: { createdAt: 'DESC' },
        })
    const visibleReviews = (await Promise.all(scopes.map(async (scope) => {
        const providerReviews = reviews.filter((review) => review.providerId === scope.providerId)
        return scope.locationIds === null ? providerReviews : filterReviewsByRequestLocations(providerReviews, scope.locationIds)
    }))).flat()
    const providerById = new Map(reviewProviders.map((provider) => [provider.id, provider]))
    const reviewSummaries = summarizeAutoCareReviews(visibleReviews)
    const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const review of visibleReviews) distribution[String(review.rating) as keyof typeof distribution]++
    const totalReviews = visibleReviews.length

    return {
        selectedProviderId: normalizedProviderId ?? null,
        providers: reviewProviders.map((provider) => ({
            id: provider.id,
            name: provider.name,
            address: provider.location.address,
            ...(reviewSummaries.get(provider.id) ?? { rating: 0, reviewCount: 0 }),
        })),
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

export async function getMyAutoCareReviews(client: UserEntity) {
    assertClient(client)
    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({ where: { clientId: client.id }, order: { createdAt: 'DESC' } })
    return reviews.map((review) => toAutoCareReviewResponse(review, { exposeActions: true }))
}
