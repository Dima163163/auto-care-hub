import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    BookingPaymentAttemptEntity,
    BookingPaymentAttemptStatus,
} from '../../entities/booking/booking-payment-attempt.entity.js'
import {
    BookingPaymentEntity,
    BookingPaymentStatus,
} from '../../entities/booking/booking-payment.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getSafeErrorDetail } from '../../shared/errors/safe-error-detail.js'
import {
    normalizePaymentCurrency,
    normalizePaymentIdempotencyKey,
    validatePaymentAmounts,
} from './payment-input.js'
import { assertPaymentCheckoutUrl } from './payment-url-policy.js'

type ReserveCheckoutAttemptInput = {
    bookingId: string
    clientIdempotencyKey?: string
    grossAmount: number
    commissionAmount: number
    ownerPayoutAmount: number
    currency: string
}

export type CheckoutAttemptReservation =
    | {
        status: 'create'
        attemptId: string
        paymentId: string
        stripeIdempotencyKey: string
        reused: boolean
    }
    | {
        status: 'ready'
        attemptId: string
        paymentId: string
        checkoutUrl: string
    }
    | {
        status: 'failed'
        failureMessage: string
    }

const activeAttemptStatuses = [
    BookingPaymentAttemptStatus.Creating,
    BookingPaymentAttemptStatus.Created,
]

async function getOrCreatePayment(
    manager: EntityManager,
    input: ReserveCheckoutAttemptInput,
) {
    await manager.query(
        `
            INSERT INTO "booking_payments" (
                "bookingId",
                "grossAmount",
                "commissionAmount",
                "ownerPayoutAmount",
                "currency",
                "status"
            )
            VALUES ($1, $2, $3, $4, $5, 'pending')
            ON CONFLICT ("bookingId") DO NOTHING
        `,
        [
            input.bookingId,
            input.grossAmount,
            input.commissionAmount,
            input.ownerPayoutAmount,
            input.currency,
        ],
    )

    const payment = await manager.getRepository(BookingPaymentEntity).findOne({
        where: { bookingId: input.bookingId },
        lock: { mode: 'pessimistic_write' },
    })

    if (!payment) {
        throw new Error(`Payment for booking ${input.bookingId} could not be reserved.`)
    }

    return payment
}

async function findActiveAttempt(
    manager: EntityManager,
    paymentId: string,
    idempotencyKey?: string,
) {
    const repository = manager.getRepository(BookingPaymentAttemptEntity)

    if (idempotencyKey) {
        return repository.findOne({
            where: { paymentId, idempotencyKey },
            lock: { mode: 'pessimistic_write' },
        })
    }

    return repository
        .createQueryBuilder('attempt')
        .where('attempt.paymentId = :paymentId', { paymentId })
        .andWhere('attempt.status IN (:...statuses)', {
            statuses: activeAttemptStatuses,
        })
        .orderBy('attempt.attemptNumber', 'DESC')
        .setLock('pessimistic_write')
        .getOne()
}

export async function reserveCheckoutAttempt(input: ReserveCheckoutAttemptInput) {
    validatePaymentAmounts(input)
    const normalizedInput = {
        ...input,
        clientIdempotencyKey: normalizePaymentIdempotencyKey(input.clientIdempotencyKey),
        currency: normalizePaymentCurrency(input.currency),
    }

    return AppDataSource.transaction(async (manager) => {
        const payment = await getOrCreatePayment(manager, normalizedInput)

        if (payment.status === BookingPaymentStatus.Paid) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Booking is already paid.',
            })
        }

        if (payment.status === BookingPaymentStatus.Refunded) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Refunded booking cannot be reopened for payment.',
            })
        }

        payment.grossAmount = normalizedInput.grossAmount
        payment.commissionAmount = normalizedInput.commissionAmount
        payment.ownerPayoutAmount = normalizedInput.ownerPayoutAmount
        payment.currency = normalizedInput.currency
        payment.status = BookingPaymentStatus.Pending
        await manager.getRepository(BookingPaymentEntity).save(payment)

        const scopedClientKey = normalizedInput.clientIdempotencyKey
            ? `checkout:${input.bookingId}:client:${normalizedInput.clientIdempotencyKey}`
            : undefined
        const existingAttempt = await findActiveAttempt(manager, payment.id, scopedClientKey)

        if (existingAttempt?.status === BookingPaymentAttemptStatus.Created) {
            if (existingAttempt.checkoutUrl) {
                return {
                    status: 'ready' as const,
                    attemptId: existingAttempt.id,
                    paymentId: payment.id,
                    checkoutUrl: existingAttempt.checkoutUrl,
                }
            }

            return {
                status: 'create' as const,
                attemptId: existingAttempt.id,
                paymentId: payment.id,
                stripeIdempotencyKey: existingAttempt.idempotencyKey,
                reused: true,
            }
        }

        if (existingAttempt?.status === BookingPaymentAttemptStatus.Creating) {
            return {
                status: 'create' as const,
                attemptId: existingAttempt.id,
                paymentId: payment.id,
                stripeIdempotencyKey: existingAttempt.idempotencyKey,
                reused: true,
            }
        }

        if (scopedClientKey) {
            const previousAttempt = await manager.getRepository(BookingPaymentAttemptEntity).findOneBy({
                paymentId: payment.id,
                idempotencyKey: scopedClientKey,
            })

            if (previousAttempt?.status === BookingPaymentAttemptStatus.Failed) {
                return {
                    status: 'failed' as const,
                    failureMessage: previousAttempt.failureMessage
                        ?? 'The previous checkout attempt failed. Use a new idempotency key to retry.',
                }
            }
        }

        const maxAttempt = await manager.getRepository(BookingPaymentAttemptEntity)
            .createQueryBuilder('attempt')
            .select('MAX(attempt.attemptNumber)', 'max')
            .where('attempt.paymentId = :paymentId', { paymentId: payment.id })
            .getRawOne<{ max: string | null }>()
        const attemptNumber = Number(maxAttempt?.max ?? 0) + 1
        const idempotencyKey = scopedClientKey
            ?? `checkout:${input.bookingId}:attempt:${attemptNumber}`
        const attempt = manager.getRepository(BookingPaymentAttemptEntity).create({
            paymentId: payment.id,
            bookingId: input.bookingId,
            attemptNumber,
            idempotencyKey,
            clientIdempotencyKey: normalizedInput.clientIdempotencyKey ?? null,
            status: BookingPaymentAttemptStatus.Creating,
            stripeSessionId: null,
            checkoutUrl: null,
            failureMessage: null,
        })
        const savedAttempt = await manager.getRepository(BookingPaymentAttemptEntity).save(attempt)

        return {
            status: 'create' as const,
            attemptId: savedAttempt.id,
            paymentId: payment.id,
            stripeIdempotencyKey: savedAttempt.idempotencyKey,
            reused: false,
        }
    })
}

export async function completeCheckoutAttempt(input: {
    attemptId: string
    paymentId: string
    stripeSessionId: string
    checkoutUrl: string
}) {
    const checkoutUrl = assertPaymentCheckoutUrl(input.checkoutUrl)

    return AppDataSource.transaction(async (manager) => {
        const attemptRepository = manager.getRepository(BookingPaymentAttemptEntity)
        const attempt = await attemptRepository.findOne({
            where: { id: input.attemptId, paymentId: input.paymentId },
            lock: { mode: 'pessimistic_write' },
        })

        if (!attempt) {
            throw new Error(`Payment attempt ${input.attemptId} was not found.`)
        }

        if (attempt.stripeSessionId && attempt.stripeSessionId !== input.stripeSessionId) {
            throw new Error(`Payment attempt ${attempt.id} received conflicting Stripe sessions.`)
        }

        const paymentRepository = manager.getRepository(BookingPaymentEntity)
        const payment = await paymentRepository.findOne({
            where: { id: input.paymentId },
            lock: { mode: 'pessimistic_write' },
        })

        if (!payment) {
            throw new Error(`Payment ${input.paymentId} was not found.`)
        }

        if (payment.status === BookingPaymentStatus.Paid) {
            attempt.status = BookingPaymentAttemptStatus.Paid
            attempt.stripeSessionId = input.stripeSessionId
            attempt.checkoutUrl = checkoutUrl
            attempt.failureMessage = null
            await attemptRepository.save(attempt)
            return { attempt, payment }
        }

        if (payment.status === BookingPaymentStatus.Failed) {
            attempt.status = BookingPaymentAttemptStatus.Failed
            attempt.stripeSessionId = input.stripeSessionId
            attempt.checkoutUrl = checkoutUrl
            await attemptRepository.save(attempt)
            return { attempt, payment }
        }

        if (payment.status === BookingPaymentStatus.Refunded) {
            attempt.status = BookingPaymentAttemptStatus.Expired
            attempt.stripeSessionId = input.stripeSessionId
            attempt.checkoutUrl = checkoutUrl
            await attemptRepository.save(attempt)
            return { attempt, payment }
        }

        attempt.status = BookingPaymentAttemptStatus.Created
        attempt.stripeSessionId = input.stripeSessionId
        attempt.checkoutUrl = checkoutUrl
        attempt.failureMessage = null
        await attemptRepository.save(attempt)

        payment.status = BookingPaymentStatus.Pending
        payment.stripeSessionId = input.stripeSessionId
        await paymentRepository.save(payment)

        return { attempt, payment }
    })
}

export async function failCheckoutAttempt(input: {
    attemptId: string
    failureMessage: string
}) {
    return AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(BookingPaymentAttemptEntity)
        const attempt = await repository.findOne({
            where: { id: input.attemptId },
            lock: { mode: 'pessimistic_write' },
        })

        if (!attempt || attempt.status !== BookingPaymentAttemptStatus.Creating) {
            return attempt
        }

        attempt.status = BookingPaymentAttemptStatus.Failed
        attempt.failureMessage = getSafeErrorDetail(new Error(input.failureMessage), 'Payment attempt failed.')
        return repository.save(attempt)
    })
}
