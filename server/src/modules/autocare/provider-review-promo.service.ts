import { randomBytes } from 'node:crypto'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveReviewEntity, AutomotiveReviewPromoEntity, AutomotiveReviewPromoStatus, AutomotiveReviewStatus } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { ServiceRequestEntity } from '../../entities/automotive/service-request.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { hasProviderWorkspacePermission } from './provider-access.service.js'
import { normalizeAutoCareReviewPromoCode, normalizeAutoCareReviewPromoInput, normalizeAutoCareReviewUuid } from './review-input-policy.js'
import type { AutoCareReviewPromoResponse, CreateAutoCareReviewPromoInput, RedeemAutoCareReviewPromoInput } from './autocare.types.js'
import { assertClient, assertOwner } from './provider-guards.js'
import { toAutoCareReviewPromoResponse } from './provider-review-read-model.service.js'

function makeReviewPromoCode() {
    return `CARE-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function createOwnerAutoCareReviewPromo(owner: UserEntity, providerId: string, reviewId: string, input: CreateAutoCareReviewPromoInput): Promise<AutoCareReviewPromoResponse> {
    assertOwner(owner)
    const normalizedProviderId = normalizeAutoCareReviewUuid(providerId)
    const normalizedReviewId = normalizeAutoCareReviewUuid(reviewId)
    const normalizedInput = normalizeAutoCareReviewPromoInput(input)
    if (!normalizedProviderId || !normalizedReviewId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider and review ids must be valid UUIDs.' })
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Review promo payload is invalid.' })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    const review = await AppDataSource.getRepository(AutomotiveReviewEntity).findOneBy({ id: normalizedReviewId, providerId: normalizedProviderId, status: AutomotiveReviewStatus.Approved })
    if (!review) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive review not found.' })
    const request = review.serviceRequestId
        ? await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: review.serviceRequestId, providerId: normalizedProviderId })
        : null
    if (!provider || !(await hasProviderWorkspacePermission(owner.id, normalizedProviderId, 'reviews', request?.locationId ?? null))) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    if (!review.clientId) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This review is not linked to a client account yet.' })

    const promoRepository = AppDataSource.getRepository(AutomotiveReviewPromoEntity)
    let code = makeReviewPromoCode()
    while (await promoRepository.existsBy({ code })) code = makeReviewPromoCode()
    const promo = promoRepository.create({
        providerId: normalizedProviderId,
        reviewId: normalizedReviewId,
        clientId: review.clientId,
        serviceRequestId: review.serviceRequestId,
        serviceSlug: normalizedInput.serviceSlug ?? review.serviceSlug,
        code,
        discountPercent: normalizedInput.discountPercent,
        status: AutomotiveReviewPromoStatus.Active,
        expiresAt: new Date(Date.now() + normalizedInput.expiresInDays * 24 * 60 * 60 * 1_000),
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
        metadata: { domain: 'autocare', reviewId: normalizedReviewId, promoId: savedPromo.id },
    }, `notification:autocare-review-promo:${savedPromo.id}`)
    return toAutoCareReviewPromoResponse(savedPromo)
}

export async function redeemAutoCareReviewPromo(client: UserEntity, input: RedeemAutoCareReviewPromoInput): Promise<AutoCareReviewPromoResponse> {
    assertClient(client)
    const normalizedInput = normalizeAutoCareReviewPromoCode(input?.code)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Promo code is invalid.' })
    return AppDataSource.transaction(async (manager) => {
        const promoRepository = manager.getRepository(AutomotiveReviewPromoEntity)
        const promo = await promoRepository.findOne({ where: { code: normalizedInput.code }, lock: { mode: 'pessimistic_write' } })
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
