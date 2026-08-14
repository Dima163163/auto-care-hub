import { AppDataSource } from '../../database/data-source.js'
import { PlatformReviewEntity, PlatformReviewStatus } from '../../entities/index.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { isAdminRole, isSuperAdmin } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import type { CreatePlatformReviewInput, PlatformReviewResponse, RespondPlatformReviewInput } from './platform-reviews.types.js'

function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can publish platform reviews.' })
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only administrators can moderate platform reviews.' })
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

export async function getPublicPlatformReviews(limit: number) {
    const reviews = await AppDataSource.getRepository(PlatformReviewEntity).find({ where: { status: PlatformReviewStatus.Approved }, order: { createdAt: 'DESC' }, take: limit })
    return reviews.map(toPlatformReviewResponse)
}

export async function createPlatformReview(client: UserEntity, input: CreatePlatformReviewInput) {
    assertClient(client)
    const review = AppDataSource.getRepository(PlatformReviewEntity).create({
        clientId: client.id,
        authorName: client.name,
        avatarUrl: client.avatarUrl,
        authorRole: 'AutoCare Hub клиент',
        rating: input.rating,
        text: input.text,
        status: PlatformReviewStatus.Pending,
        organizationResponse: null,
        respondedById: null,
        organizationRespondedAt: null,
    })
    return toPlatformReviewResponse(await AppDataSource.getRepository(PlatformReviewEntity).save(review))
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

export async function respondToPlatformReview(admin: UserEntity, reviewId: string, input: RespondPlatformReviewInput) {
    assertAdmin(admin)
    const repository = AppDataSource.getRepository(PlatformReviewEntity)
    const review = await repository.findOneBy({ id: reviewId })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Platform review not found.' })
    review.organizationResponse = input.response
    review.respondedById = admin.id
    review.organizationRespondedAt = new Date()
    if (review.status === PlatformReviewStatus.Pending) review.status = PlatformReviewStatus.Approved
    return toPlatformReviewResponse(await repository.save(review))
}

export async function deletePlatformReview(superAdmin: UserEntity, reviewId: string) {
    if (!isSuperAdmin(superAdmin)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only a super administrator can remove platform reviews.' })
    const repository = AppDataSource.getRepository(PlatformReviewEntity)
    const review = await repository.findOneBy({ id: reviewId })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Platform review not found.' })
    review.status = PlatformReviewStatus.Removed
    await repository.save(review)
    return { success: true } as const
}
