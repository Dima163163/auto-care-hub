import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveReviewEntity, AutomotiveReviewStatus, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getManagedProviderPermissionScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { isRolloutEnabled } from './rollout-controls.js'
import { getAutoCareTrustRollout } from '../admin/super-admin-trust-policy.service.js'
import { getPublicAutoCareReviewSummaries } from './autocare-review-summary.js'
import { toOfferResponse, toProviderResponse } from './autocare.mappers.js'
import { normalizeAutoCarePublicProviderUuid, normalizeAutoCarePublicServiceId } from './public-provider-input-policy.js'
import type { AutoCareProviderProfileResponse } from './autocare.types.js'
import { assertProviderActive, throwNotFound } from './provider-guards.js'
import { filterReviewsByRequestLocations, summarizeAutoCareReviews } from './provider-review-read-model.service.js'
import { findServiceDefinition, getPublicProviderLocations } from './public-market-access.service.js'

export async function getAutoCareProviderProfile(providerId: string): Promise<AutoCareProviderProfileResponse> {
    const normalizedProviderId = normalizeAutoCarePublicProviderUuid(providerId)
    if (!normalizedProviderId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    assertProviderActive(provider)
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const locations = await getPublicProviderLocations(provider.id)
    if (locations.length === 0) throwNotFound('Automotive provider location not found.')
    const offers = await offeringRepository.find({ where: { locationId: In(locations.map((item) => item.id)), active: true }, order: { priceFromMinor: 'ASC' } })
    const definitions = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findByIds(offers.map((offer) => offer.definitionId))
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]))
    const offersByLocation = new Map<string, ReturnType<typeof toOfferResponse>[]>()
    for (const location of locations) {
        offersByLocation.set(location.id, offers.filter((offer) => offer.locationId === location.id).map((offer) => toOfferResponse(offer, definitionById.get(offer.definitionId))))
    }
    const firstLocation = locations[0]!
    const trustRollout = await getAutoCareTrustRollout()
    const trustEnabled = locations.some((location) => isRolloutEnabled(trustRollout, {
        marketId: location.marketId,
        subjectKey: provider.id,
    }))
    const reviewSummary = (await getPublicAutoCareReviewSummaries([provider.id])).get(provider.id) ?? { rating: 0, reviewCount: 0 }
    return {
        ...toProviderResponse(provider, firstLocation, { trustEnabled, ...reviewSummary }),
        offers: offersByLocation.get(firstLocation.id) ?? [],
        locations: locations.map((location) => ({ location: toProviderResponse(provider, location, { trustEnabled, ...reviewSummary }).location, offers: offersByLocation.get(location.id) ?? [] })),
    }
}

export async function getAutoCareProviderOffers(providerId: string, serviceId?: string) {
    const normalizedProviderId = normalizeAutoCarePublicProviderUuid(providerId)
    if (!normalizedProviderId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    const normalizedServiceId = serviceId === undefined ? undefined : normalizeAutoCarePublicServiceId(serviceId)
    if (serviceId !== undefined && !normalizedServiceId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service id must be a non-empty value up to 120 characters.' })
    const profile = await getAutoCareProviderProfile(normalizedProviderId)
    const offers = profile.locations.flatMap((location) => location.offers)
    if (!normalizedServiceId) return offers
    const definition = await findServiceDefinition(normalizedServiceId)
    return definition ? offers.filter((offer) => offer.serviceDefinitionId === definition.id) : []
}

export async function getOwnerAutoCareProviders(owner: UserEntity) {
    // The provider-management page exposes published offers and prices. Keep
    // the aggregate list behind the catalog capability instead of the broad
    // workspace membership check: staff may work requests/calendar but must
    // not receive the catalog projection through a direct API call.
    const scopes = await getManagedProviderPermissionScopes(owner.id, 'catalog')
    const providerIds = scopes.map(({ providerId }) => providerId)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) }, order: { createdAt: 'DESC' } })
    if (providers.length === 0) return []

    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const locations = await locationRepository.findBy({ providerId: In(providers.map((provider) => provider.id)) })
    const visibleLocations = locations.filter((location) => isManagedProviderLocationAllowed(scopes, location.providerId, location.id))
    const locationsByProviderId = new Map<string, AutomotiveServiceLocationEntity[]>()
    for (const location of visibleLocations) {
        const providerLocations = locationsByProviderId.get(location.providerId) ?? []
        providerLocations.push(location)
        locationsByProviderId.set(location.providerId, providerLocations)
    }
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

    const reviewScopes = await getManagedProviderPermissionScopes(owner.id, 'reviews')
    const reviewProviderIds = [...new Set(reviewScopes.map((scope) => scope.providerId).filter((id) => providers.some((provider) => provider.id === id)))]
    const approvedReviews = reviewProviderIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveReviewEntity).find({
            where: { providerId: In(reviewProviderIds), status: AutomotiveReviewStatus.Approved },
            order: { createdAt: 'DESC' },
        })
    const reviewsByProviderId = new Map<string, AutomotiveReviewEntity[]>()
    for (const review of approvedReviews) {
        const providerReviews = reviewsByProviderId.get(review.providerId) ?? []
        providerReviews.push(review)
        reviewsByProviderId.set(review.providerId, providerReviews)
    }
    const reviewSummaryByProviderId = new Map<string, { rating: number; reviewCount: number }>()
    for (const scope of reviewScopes) {
        const providerReviews = reviewsByProviderId.get(scope.providerId) ?? []
        const visibleReviews = scope.locationIds === null
            ? providerReviews
            : await filterReviewsByRequestLocations(providerReviews, scope.locationIds)
        const summaries = summarizeAutoCareReviews(visibleReviews)
        reviewSummaryByProviderId.set(scope.providerId, summaries.get(scope.providerId) ?? { rating: 0, reviewCount: 0 })
    }

    return providers.flatMap((provider) => {
        const providerLocations = locationsByProviderId.get(provider.id) ?? []
        const location = providerLocations[0]
        if (!location) return []
        const reviewSummary = reviewSummaryByProviderId.get(provider.id) ?? { rating: 0, reviewCount: 0 }
        return [{
            ...toProviderResponse(provider, location, reviewSummary),
            offers: (offersByLocationId.get(location.id) ?? []).map((offer) => toOfferResponse(offer, definitionById.get(offer.definitionId))),
            locations: providerLocations.map((branch) => ({
                location: toProviderResponse(provider, branch, reviewSummary).location,
                offers: (offersByLocationId.get(branch.id) ?? []).map((offer) => toOfferResponse(offer, definitionById.get(offer.definitionId))),
            })),
        }]
    })
}
