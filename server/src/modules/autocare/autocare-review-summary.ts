import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { isAutoCareCountryEnabled } from '../../config/enabled-market-countries.js'
import {
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceLocationEntity,
} from '../../entities/index.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'

export type AutoCareReviewSummary = { rating: number; reviewCount: number }
type PublicReviewSummaryReview = Pick<AutomotiveReviewEntity, 'providerId' | 'rating' | 'status' | 'verifiedVisit' | 'serviceRequestId'>
type PublicReviewSummaryRequest = Pick<ServiceRequestEntity, 'id' | 'providerId' | 'locationId' | 'status' | 'clientConfirmedAt' | 'providerConfirmedAt'>
type PublicReviewSummaryLocation = Pick<AutomotiveServiceLocationEntity, 'id'>

export function aggregatePublicAutoCareReviewSummaries(
    providerIds: readonly string[],
    locations: readonly PublicReviewSummaryLocation[],
    reviews: readonly PublicReviewSummaryReview[],
    requests: readonly PublicReviewSummaryRequest[],
) {
    const summaries = new Map<string, AutoCareReviewSummary>(providerIds.map((providerId) => [providerId, { rating: 0, reviewCount: 0 }]))
    const allowedProviderIds = new Set(providerIds)
    const publicLocationIds = new Set(locations.map((location) => location.id))
    const requestsById = new Map(requests
        .filter((request) => allowedProviderIds.has(request.providerId)
            && publicLocationIds.has(request.locationId)
            && request.status === ServiceRequestStatus.Closed
            && request.clientConfirmedAt
            && request.providerConfirmedAt)
        .map((request) => [request.id, request]))
    const grouped = new Map<string, number[]>()

    for (const review of reviews) {
        if (review.status !== AutomotiveReviewStatus.Approved || !review.verifiedVisit || !review.serviceRequestId) continue
        const request = requestsById.get(review.serviceRequestId)
        if (!request || request.providerId !== review.providerId) continue
        const ratings = grouped.get(review.providerId) ?? []
        ratings.push(review.rating)
        grouped.set(review.providerId, ratings)
    }

    for (const [providerId, ratings] of grouped) {
        summaries.set(providerId, {
            rating: Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)),
            reviewCount: ratings.length,
        })
    }
    return summaries
}

/** Public aggregates include only approved reviews tied to visits at a launch-ready market. */
export async function getPublicAutoCareReviewSummaries(providerIds: readonly string[]) {
    const uniqueProviderIds = [...new Set(providerIds)]
    if (uniqueProviderIds.length === 0) return new Map<string, AutoCareReviewSummary>()

    const emptySummaries = () => aggregatePublicAutoCareReviewSummaries(uniqueProviderIds, [], [], [])

    const locations = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ where: { providerId: In(uniqueProviderIds) } })
    if (locations.length === 0) return emptySummaries()

    const markets = await AppDataSource.getRepository(AutomotiveMarketEntity).find({
        where: { id: In([...new Set(locations.map((location) => location.marketId))]), launchReady: true },
        select: { id: true, countryId: true, countryCode: true },
    })
    const enabledMarkets = markets.filter((market) => isAutoCareCountryEnabled(market.countryCode))
    if (enabledMarkets.length === 0) return emptySummaries()
    const activeCountries = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).find({
        where: { id: In([...new Set(enabledMarkets.map((market) => market.countryId))]), active: true },
        select: { id: true },
    })
    const activeCountryIds = new Set(activeCountries.map((country) => country.id))
    const publicMarketIds = new Set(enabledMarkets.filter((market) => activeCountryIds.has(market.countryId)).map((market) => market.id))
    const publicLocations = locations.filter((location) => publicMarketIds.has(location.marketId))
    if (publicLocations.length === 0) return emptySummaries()

    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        where: { providerId: In(uniqueProviderIds), status: AutomotiveReviewStatus.Approved, verifiedVisit: true },
        order: { createdAt: 'DESC' },
    })
    const requestIds = [...new Set(reviews.flatMap((review) => review.serviceRequestId ? [review.serviceRequestId] : []))]
    if (requestIds.length === 0) return emptySummaries()

    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({
        where: { id: In(requestIds), providerId: In(uniqueProviderIds), locationId: In(publicLocations.map((location) => location.id)) },
        select: { id: true, providerId: true, locationId: true, status: true, clientConfirmedAt: true, providerConfirmedAt: true },
    })
    return aggregatePublicAutoCareReviewSummaries(uniqueProviderIds, publicLocations, reviews, requests)
}
