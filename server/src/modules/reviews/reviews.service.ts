import { In } from 'typeorm'
import type { QueryFailedError } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    BookingEntity,
    BookingStatus,
} from '../../entities/booking/booking.entity.js'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import {
    ReviewEntity,
    ReviewStatus,
} from '../../entities/review/review.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { enqueueReviewModerationNotificationSafely } from '../outbox/review-moderation-outbox.service.js'
import {
    toAdminReview,
    toClientReview,
    toPublicReview,
} from './reviews.mappers.js'
import {
    MAX_PUBLIC_REVIEWS,
    normalizeReviewInput,
} from './review-input-policy.js'
import { assertReviewStatus } from './review-status-policy.js'

type CreateReviewInput = {
    rating: number
    text: string
}

type UpdateClientReviewInput = CreateReviewInput

function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only clients can create reviews.',
        })
    }
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only admins can moderate reviews.',
        })
    }
}

function isReviewsSchemaNotReadyError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown }
        | undefined

    return (
        driverError?.code === '42P01' ||
        driverError?.code === '42703' ||
        driverError?.code === '42704'
    )
}

function createReviewsSchemaNotReadyError() {
    return new AppError({
        statusCode: 503,
        code: ERROR_CODES.ReviewStorageNotReady,
        message: 'Review storage is not ready. Apply the reviews SQL setup script.',
    })
}

async function runReviewStorageOperation<T>(
    operation: () => Promise<T>,
    fallbackOnSchemaNotReady?: () => T
) {
    try {
        return await operation()
    } catch (error) {
        if (isReviewsSchemaNotReadyError(error)) {
            if (fallbackOnSchemaNotReady) {
                return fallbackOnSchemaNotReady()
            }

            throw createReviewsSchemaNotReadyError()
        }

        throw error
    }
}

async function getEligibleCompletedBooking(clientId: string, cabinetId: string) {
    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const reviewRepository = AppDataSource.getRepository(ReviewEntity)

    const completedBookings = await bookingRepository.find({
        where: {
            clientId,
            cabinetId,
            status: BookingStatus.Completed,
        },
        order: {
            createdAt: 'DESC',
        },
    })

    if (completedBookings.length === 0) {
        return null
    }

    const bookingIds = completedBookings.map((booking) => booking.id)
    const existingReviews = await runReviewStorageOperation(() =>
        reviewRepository.find({
            where: {
                bookingId: In(bookingIds),
            },
        })
    )
    const reviewedBookingIds = new Set(
        existingReviews.map((review) => review.bookingId)
    )

    return completedBookings.find(
        (booking) => !reviewedBookingIds.has(booking.id)
    ) ?? null
}

export async function getPublicReviewsByCabinetId(cabinetId: string) {
    const reviewRepository = AppDataSource.getRepository(ReviewEntity)

    const reviews = await runReviewStorageOperation(
        () => reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .where('review.cabinetId = :cabinetId', { cabinetId })
            .andWhere('review.status = :status', {
                status: ReviewStatus.Approved,
            })
            .orderBy('review.createdAt', 'DESC')
            .take(MAX_PUBLIC_REVIEWS)
            .getMany(),
        () => []
    )

    return reviews.map(toPublicReview)
}

export async function createCabinetReview(
    client: UserEntity,
    cabinetId: string,
    input: CreateReviewInput
) {
    assertClient(client)
    const normalizedInput = normalizeReviewInput(input)

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const reviewRepository = AppDataSource.getRepository(ReviewEntity)

    const cabinet = await cabinetRepository.findOne({
        where: {
            id: cabinetId,
            status: CabinetStatus.Active,
        },
    })

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    const booking = await getEligibleCompletedBooking(client.id, cabinetId)

    if (!booking) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'A completed booking for this cabinet is required before leaving a review.',
        })
    }

    const review = reviewRepository.create({
        cabinetId,
        clientId: client.id,
        bookingId: booking.id,
        rating: normalizedInput.rating,
        text: normalizedInput.text,
        status: ReviewStatus.Pending,
    })

    const reviewWithClient = await runReviewStorageOperation(async () => {
        const savedReview = await reviewRepository.save(review)

        return reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .where('review.id = :reviewId', { reviewId: savedReview.id })
            .getOne()
    })

    if (!reviewWithClient) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Review not found.',
        })
    }

    return toPublicReview(reviewWithClient)
}

export async function getClientReviewByCabinetId(
    client: UserEntity,
    cabinetId: string
) {
    assertClient(client)

    const reviewRepository = AppDataSource.getRepository(ReviewEntity)
    const review = await runReviewStorageOperation(
        () => reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .where('review.cabinetId = :cabinetId', { cabinetId })
            .andWhere('review.clientId = :clientId', { clientId: client.id })
            .orderBy('review.createdAt', 'DESC')
            .getOne(),
        () => null
    )

    return review ? toPublicReview(review) : null
}

export async function getClientReviews(client: UserEntity) {
    assertClient(client)

    const reviewRepository = AppDataSource.getRepository(ReviewEntity)
    const reviews = await runReviewStorageOperation(
        () => reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .leftJoinAndSelect('review.cabinet', 'cabinet')
            .where('review.clientId = :clientId', { clientId: client.id })
            .orderBy('review.createdAt', 'DESC')
            .take(MAX_PUBLIC_REVIEWS)
            .getMany(),
        () => []
    )

    return reviews.map(toClientReview)
}

export async function getAdminReviews(admin: UserEntity) {
    assertAdmin(admin)

    const reviewRepository = AppDataSource.getRepository(ReviewEntity)
    const reviews = await runReviewStorageOperation(
        () => reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .leftJoinAndSelect('review.cabinet', 'cabinet')
            .orderBy('review.createdAt', 'DESC')
            .take(MAX_PUBLIC_REVIEWS)
            .getMany(),
        () => []
    )

    return reviews.map(toAdminReview)
}

export async function updateClientReview(
    client: UserEntity,
    reviewId: string,
    input: UpdateClientReviewInput
) {
    assertClient(client)
    const normalizedInput = normalizeReviewInput(input)

    const reviewRepository = AppDataSource.getRepository(ReviewEntity)
    const review = await runReviewStorageOperation(() =>
        reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .where('review.id = :reviewId', { reviewId })
            .andWhere('review.clientId = :clientId', { clientId: client.id })
            .getOne()
    )

    if (!review) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Review not found.',
        })
    }

    review.rating = normalizedInput.rating
    review.text = normalizedInput.text
    review.status = ReviewStatus.Pending

    const savedReview = await runReviewStorageOperation(() =>
        reviewRepository.save(review)
    )

    return toPublicReview({
        ...review,
        rating: savedReview.rating,
        text: savedReview.text,
        status: savedReview.status,
        updatedAt: savedReview.updatedAt,
    })
}

export async function updateAdminReviewStatus(
    admin: UserEntity,
    reviewId: string,
    status: ReviewStatus
) {
    assertAdmin(admin)
    const normalizedStatus = assertReviewStatus(status)

    const reviewRepository = AppDataSource.getRepository(ReviewEntity)
    const review = await runReviewStorageOperation(() =>
        reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.client', 'client')
            .leftJoinAndSelect('review.cabinet', 'cabinet')
            .where('review.id = :reviewId', { reviewId })
            .getOne()
    )

    if (!review) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Review not found.',
        })
    }

    const oldStatus = review.status
    review.status = normalizedStatus

    const savedReview = await runReviewStorageOperation(() =>
        reviewRepository.save(review)
    )

    if (oldStatus !== savedReview.status && review.client && review.cabinet) {
        await enqueueReviewModerationNotificationSafely({
            userId: review.client.id,
            reviewId: savedReview.id,
            cabinetId: review.cabinetId,
            cabinetTitle: review.cabinet.title,
            previousStatus: oldStatus,
            status: savedReview.status,
        })
    }

    return {
        review: toAdminReview({
            ...review,
            status: savedReview.status,
            updatedAt: savedReview.updatedAt,
        }),
        oldStatus,
        newStatus: savedReview.status,
    }
}

export async function deleteAdminReview(admin: UserEntity, reviewId: string) {
    assertAdmin(admin)

    const reviewRepository = AppDataSource.getRepository(ReviewEntity)
    const review = await runReviewStorageOperation(() =>
        reviewRepository.findOne({
            where: {
                id: reviewId,
            },
        })
    )

    if (!review) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Review not found.',
        })
    }

    const reviewData = {
        rating: review.rating,
        text: review.text,
        clientId: review.clientId,
        cabinetId: review.cabinetId,
    }

    await runReviewStorageOperation(() => reviewRepository.remove(review))

    return {
        success: true,
        reviewData,
    } as const
}
