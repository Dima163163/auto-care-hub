import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveReviewEntity, AutomotiveReviewStatus } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { queueReviewModerationEvidence } from './moderation-evidence.service.js'
import { normalizeAutoCareReviewContent } from './review-integrity-policy.js'
import { normalizeAutoCareReviewUuid } from './review-input-policy.js'
import type { CreateAutoCareReviewInput, UpdateAutoCareReviewInput } from './autocare.types.js'
import { assertClient } from './provider-guards.js'
import { isReviewEditable, toAutoCareReviewResponse } from './provider-review-read-model.service.js'

function isAutoCareReviewUniqueError(error: unknown) {
    const driverError = (error as { driverError?: { code?: unknown; constraint?: unknown } }).driverError
    return driverError?.code === '23505' && driverError.constraint === 'UQ_autocare_reviews_service_request'
}

/**
 * Create exactly one verified review for a confirmed AutoCare request.
 * The request row is locked so two browser retries cannot create duplicate reviews.
 */
export async function createAutoCareReview(client: UserEntity, input: CreateAutoCareReviewInput) {
    assertClient(client)
    const requestId = normalizeAutoCareReviewUuid(input?.requestId)
    if (!requestId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service request id must be a valid UUID.' })
    const reviewContent = input && typeof input === 'object' ? normalizeAutoCareReviewContent(input) : null
    if (!reviewContent) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Review rating or text is invalid.' })
    let review: AutomotiveReviewEntity
    try {
        review = await AppDataSource.transaction(async (manager) => {
            const requestRepository = manager.getRepository(ServiceRequestEntity)
            const request = await requestRepository.findOne({
                where: { id: requestId, clientId: client.id },
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
            const savedReview = await reviewRepository.save(reviewRepository.create({
                providerId: request.providerId,
                authorName: client.name,
                vehicleLabel,
                rating: reviewContent.rating,
                text: reviewContent.text,
                avatarUrl: client.avatarUrl,
                photoUrls: [],
                clientId: client.id,
                serviceRequestId: request.id,
                verifiedVisit: true,
                serviceSlug: request.offeringSnapshot?.serviceSlug ?? null,
                status: AutomotiveReviewStatus.Pending,
            }))
            await queueReviewModerationEvidence(manager, savedReview)
            return savedReview
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
    const normalizedReviewId = normalizeAutoCareReviewUuid(reviewId)
    if (!normalizedReviewId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Review id must be a valid UUID.' })
    const reviewContent = input && typeof input === 'object' ? normalizeAutoCareReviewContent(input) : null
    if (!reviewContent) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Review rating or text is invalid.' })
    const repository = AppDataSource.getRepository(AutomotiveReviewEntity)
    const review = await repository.findOneBy({ id: normalizedReviewId, clientId: client.id })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive review not found.' })
    if (!isReviewEditable(review)) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This review can only be edited after redeeming a valid service promo code.' })
    review.rating = reviewContent.rating
    review.text = reviewContent.text
    review.status = AutomotiveReviewStatus.Pending
    review.revisionUsedAt = new Date()
    const savedReview = await repository.save(review)
    return toAutoCareReviewResponse(savedReview, { exposeActions: true })
}
