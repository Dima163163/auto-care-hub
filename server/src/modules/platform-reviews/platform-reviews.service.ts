import { AppDataSource } from '../../database/data-source.js'
import type { QueryFailedError } from 'typeorm'
import { PlatformReviewEntity, PlatformReviewStatus } from '../../entities/index.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { isAdminRole, isSuperAdmin } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import type { PlatformReviewResponse } from './platform-reviews.types.js'
import {
    normalizePlatformReviewCreateInput,
    normalizePlatformReviewResponseInput,
    normalizePlatformReviewUuid,
    normalizePlatformReviewsLimit,
} from './platform-reviews-input-policy.js'

function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can publish platform reviews.' })
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only administrators can moderate platform reviews.' })
}

function requirePlatformReviewUuid(value: unknown) {
    const normalized = normalizePlatformReviewUuid(value)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Platform review id must be a valid UUID.' })
    }
    return normalized
}

function requirePlatformReviewInput<T>(input: unknown, normalize: (value: unknown) => T | null, message: string): T {
    const normalized = normalize(input)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message })
    }
    return normalized
}

function isIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined

    return driverError?.code === '23505' && driverError.constraint === 'IDX_platform_reviews_client_idempotency_key'
}

function idempotencyConflictError(): never {
    throw new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another platform review.',
    })
}

function toPlatformReviewResponse(review: PlatformReviewEntity): PlatformReviewResponse {
    return {
        id: review.id,
        authorName: review.authorName,
        avatarUrl: review.avatarUrl,
        authorRole: review.authorRole,
        rating: review.rating,
        text: review.text,
        status: review.status,
        organizationResponse: review.organizationResponse,
        organizationRespondedAt: review.organizationRespondedAt?.toISOString() ?? null,
        createdAt: review.createdAt.toISOString(),
    }
}

export async function getPublicPlatformReviews(limit: unknown = 30) {
    const normalizedLimit = normalizePlatformReviewsLimit(limit)
    if (normalizedLimit === null) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Platform review limit must be an integer between 1 and 50.' })
    }
    const reviews = await AppDataSource.getRepository(PlatformReviewEntity).find({ where: { status: PlatformReviewStatus.Approved }, order: { createdAt: 'DESC' }, take: normalizedLimit })
    return reviews.map(toPlatformReviewResponse)
}

export async function createPlatformReview(client: UserEntity, input: unknown) {
    assertClient(client)
    const normalizedInput = requirePlatformReviewInput(input, normalizePlatformReviewCreateInput, 'Platform review payload is invalid.')
    const repository = AppDataSource.getRepository(PlatformReviewEntity)
    if (normalizedInput.idempotencyKey) {
        const existing = await repository.findOneBy({ clientId: client.id, idempotencyKey: normalizedInput.idempotencyKey })
        if (existing) {
            if (existing.rating !== normalizedInput.rating || existing.text !== normalizedInput.text) idempotencyConflictError()
            return toPlatformReviewResponse(existing)
        }
    }

    const review = repository.create({
        clientId: client.id,
        idempotencyKey: normalizedInput.idempotencyKey ?? null,
        authorName: client.name,
        avatarUrl: client.avatarUrl,
        authorRole: 'AutoCare Hub клиент',
        rating: normalizedInput.rating,
        text: normalizedInput.text,
        status: PlatformReviewStatus.Pending,
        organizationResponse: null,
        respondedById: null,
        organizationRespondedAt: null,
    })
    try {
        return toPlatformReviewResponse(await repository.save(review))
    } catch (error) {
        if (!normalizedInput.idempotencyKey || !isIdempotencyUniqueError(error)) throw error
        const existing = await repository.findOneBy({ clientId: client.id, idempotencyKey: normalizedInput.idempotencyKey })
        if (existing && existing.rating === normalizedInput.rating && existing.text === normalizedInput.text) return toPlatformReviewResponse(existing)
        if (existing) idempotencyConflictError()
        throw error
    }
}

export async function getMyPlatformReviews(client: UserEntity) {
    assertClient(client)
    const reviews = await AppDataSource.getRepository(PlatformReviewEntity).find({ where: { clientId: client.id }, order: { createdAt: 'DESC' } })
    return reviews.map(toPlatformReviewResponse)
}

export async function getAdminPlatformReviews(admin: UserEntity) {
    assertAdmin(admin)
    const reviews = await AppDataSource.getRepository(PlatformReviewEntity).find({ order: { createdAt: 'DESC' }, take: 100 })
    return reviews.map(toPlatformReviewResponse)
}

export async function respondToPlatformReview(admin: UserEntity, reviewId: unknown, input: unknown) {
    assertAdmin(admin)
    const normalizedReviewId = requirePlatformReviewUuid(reviewId)
    const normalizedInput = requirePlatformReviewInput(input, normalizePlatformReviewResponseInput, 'Platform review response is invalid.')
    const repository = AppDataSource.getRepository(PlatformReviewEntity)
    const review = await repository.findOneBy({ id: normalizedReviewId })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Platform review not found.' })
    review.organizationResponse = normalizedInput.response
    review.respondedById = admin.id
    review.organizationRespondedAt = new Date()
    if (review.status === PlatformReviewStatus.Pending) review.status = PlatformReviewStatus.Approved
    return toPlatformReviewResponse(await repository.save(review))
}

export async function deletePlatformReview(superAdmin: UserEntity, reviewId: unknown) {
    if (!isSuperAdmin(superAdmin)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only a super administrator can remove platform reviews.' })
    const normalizedReviewId = requirePlatformReviewUuid(reviewId)
    const repository = AppDataSource.getRepository(PlatformReviewEntity)
    const review = await repository.findOneBy({ id: normalizedReviewId })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Platform review not found.' })
    review.status = PlatformReviewStatus.Removed
    await repository.save(review)
    return { success: true } as const
}
