import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveReviewEntity, AutomotiveReviewPromoEntity } from '../../entities/index.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { normalizeAutoCareReviewPhotoUrls } from './autocare-public-media-policy.js'
import type { AutoCareReviewPromoResponse } from './autocare.types.js'

export function isReviewEditable(review: AutomotiveReviewEntity, now = new Date()) {
    return Boolean(review.revisionAllowedUntil && review.revisionAllowedUntil > now && !review.revisionUsedAt)
}

export function toAutoCareReviewResponse(review: AutomotiveReviewEntity, options: { exposeActions?: boolean } = {}) {
    const exposeActions = options.exposeActions ?? false
    return {
        id: review.id,
        providerId: review.providerId,
        authorName: review.authorName,
        vehicleLabel: review.vehicleLabel,
        rating: review.rating,
        text: review.text,
        avatarUrl: review.avatarUrl,
        photoUrls: normalizeAutoCareReviewPhotoUrls(review.photoUrls),
        createdAt: review.createdAt.toISOString(),
        serviceRequestId: review.serviceRequestId,
        serviceSlug: review.serviceSlug,
        revisionAllowedUntil: review.revisionAllowedUntil?.toISOString() ?? null,
        revisionUsedAt: review.revisionUsedAt?.toISOString() ?? null,
        canContact: exposeActions && Boolean(review.serviceRequestId),
        canEdit: exposeActions && isReviewEditable(review),
    }
}

export function toAutoCareReviewPromoResponse(promo: AutomotiveReviewPromoEntity): AutoCareReviewPromoResponse {
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

export async function filterReviewsByRequestLocations(reviews: AutomotiveReviewEntity[], locationIds: string[], requireVerifiedVisit = false) {
    if (reviews.length === 0 || locationIds.length === 0) return []
    const requestIds = reviews.flatMap((review) => review.serviceRequestId ? [review.serviceRequestId] : [])
    if (requestIds.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({
        where: { id: In(requestIds), locationId: In(locationIds) },
        select: { id: true, providerId: true, status: true, clientConfirmedAt: true, providerConfirmedAt: true },
    })
    const requestById = new Map(requests.map((request) => [request.id, request]))
    return reviews.filter((review) => {
        const request = review.serviceRequestId ? requestById.get(review.serviceRequestId) : undefined
        if (request?.providerId !== review.providerId) return false
        if (!requireVerifiedVisit) return true
        return review.verifiedVisit && request.status === ServiceRequestStatus.Closed && Boolean(request.clientConfirmedAt && request.providerConfirmedAt)
    })
}

export function summarizeAutoCareReviews(reviews: AutomotiveReviewEntity[]) {
    const grouped = new Map<string, AutomotiveReviewEntity[]>()
    for (const review of reviews) {
        const providerReviews = grouped.get(review.providerId) ?? []
        providerReviews.push(review)
        grouped.set(review.providerId, providerReviews)
    }
    return new Map([...grouped].map(([providerId, providerReviews]) => [providerId, {
        rating: Number((providerReviews.reduce((sum, review) => sum + review.rating, 0) / providerReviews.length).toFixed(1)),
        reviewCount: providerReviews.length,
    }]))
}
