import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareTrustEvidenceEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeAutoCareReviewPhotoUrls } from './autocare-public-media-policy.js'
import { normalizeAutoCareReviewUuid } from './review-input-policy.js'
import type { AdminAutoCareReviewResponse } from './autocare.types.js'

const ADMIN_REVIEW_LIMIT = 100

type AdminAutoCareReviewStatus = AutomotiveReviewStatus.Approved | AutomotiveReviewStatus.Rejected

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only admins can moderate automotive reviews.',
        })
    }
}

function normalizeModerationReason(reason: string | undefined) {
    if (typeof reason !== 'string') return null

    const normalized = reason.normalize('NFKC').trim()
    return normalized.length > 0 ? normalized : null
}

function toAdminAutoCareReviewResponse(
    review: AutomotiveReviewEntity,
    providerName: string | undefined,
): AdminAutoCareReviewResponse {
    return {
        id: review.id,
        providerId: review.providerId,
        providerName: providerName ?? review.providerId,
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
        canContact: false,
        canEdit: false,
        status: review.status,
    }
}

async function getProviderNames(providerIds: readonly string[]) {
    if (providerIds.length === 0) return new Map<string, string>()

    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({
        where: { id: In(providerIds) },
        select: { id: true, name: true },
    })

    return new Map(providers.map((provider) => [provider.id, provider.name]))
}

export async function listAdminAutoCareReviews(admin: UserEntity) {
    assertAdmin(admin)

    const reviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        order: { createdAt: 'DESC' },
        take: ADMIN_REVIEW_LIMIT,
    })
    const providerNames = await getProviderNames([...new Set(reviews.map((review) => review.providerId))])

    return reviews.map((review) => toAdminAutoCareReviewResponse(review, providerNames.get(review.providerId)))
}

export async function decideAdminAutoCareReview(
    admin: UserEntity,
    reviewId: string,
    input: { status: AdminAutoCareReviewStatus; reason?: string },
) {
    assertAdmin(admin)

    const normalizedReviewId = normalizeAutoCareReviewUuid(reviewId)
    if (!normalizedReviewId) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Review id must be a valid UUID.',
        })
    }

    const reason = normalizeModerationReason(input.reason)
    if (input.status === AutomotiveReviewStatus.Rejected && !reason) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'A reason is required when blocking an automotive review.',
        })
    }

    const result = await AppDataSource.transaction(async (manager) => {
        const reviewRepository = manager.getRepository(AutomotiveReviewEntity)
        const review = await reviewRepository.findOne({
            where: { id: normalizedReviewId },
            lock: { mode: 'pessimistic_write' },
        })

        if (!review) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Automotive review not found.',
            })
        }

        const oldStatus = review.status
        review.status = input.status
        const savedReview = await reviewRepository.save(review)
        const evidenceRepository = manager.getRepository(AutoCareTrustEvidenceEntity)
        const pendingEvidence = await evidenceRepository.findOne({
            where: { kind: 'review', reference: savedReview.id, status: 'pending' },
            lock: { mode: 'pessimistic_write' },
        })
        if (pendingEvidence) {
            pendingEvidence.status = input.status
            pendingEvidence.notes = reason ?? pendingEvidence.notes
            pendingEvidence.verifiedById = admin.id
            pendingEvidence.verifiedAt = new Date()
            await evidenceRepository.save(pendingEvidence)
        }
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOne({
            where: { id: savedReview.providerId },
            select: { id: true, name: true },
        })

        return {
            review: toAdminAutoCareReviewResponse(savedReview, provider?.name),
            oldStatus,
            newStatus: savedReview.status,
            reason,
        }
    })

    return result
}
