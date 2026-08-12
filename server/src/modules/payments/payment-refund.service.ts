import type { FastifyRequest } from 'fastify'
import Stripe from 'stripe'

import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { applyPaymentTransition } from './payment-transition.service.js'
import {
    assertRefundReason,
    getRefundAmountBounds,
    getRefundEligibility,
    getRefundStatusForAmount,
    isRefundSucceeded,
} from './refund-guards.js'
import { toStripeMinorUnits } from './payment-money.js'
import { assertRefundActorIsSuperAdmin } from './refund-authorization.js'

type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer'

export async function refundBookingPayment(
    admin: UserEntity,
    paymentId: string,
    reason: RefundReason,
    request?: FastifyRequest,
    requestedAmountMinor?: number,
) {
    const normalizedReason = assertRefundReason(reason)
    assertRefundActorIsSuperAdmin(admin.role)

    const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
    const payment = await paymentRepository.findOneBy({ id: paymentId })

    if (!payment) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Payment not found.',
        })
    }

    const eligibility = getRefundEligibility(payment.status, payment.stripePaymentIntentId)

    if (eligibility.alreadyRefunded) {
        return payment
    }

    if (!eligibility.allowed || !payment.stripePaymentIntentId) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Only paid or partially refunded payments with a Stripe PaymentIntent can be refunded.',
        })
    }

    const paymentAmountMinor = toStripeMinorUnits(payment.grossAmount)
    const alreadyRefundedAmount = payment.refundedAmountMinor ?? 0
    const refundAmount = getRefundAmountBounds(
        paymentAmountMinor,
        alreadyRefundedAmount,
        requestedAmountMinor ?? paymentAmountMinor - alreadyRefundedAmount,
    )
    const requestIdempotencyKey = request
        ? getOptionalIdempotencyKey(request.headers)
        : undefined
    const stripeIdempotencyKey = requestIdempotencyKey
        ? `refund:booking-payment:${payment.id}:request:${requestIdempotencyKey}`
        : `refund:booking-payment:${payment.id}:remaining:${refundAmount.requestedAmount}`

    let refund: Stripe.Refund
    try {
        refund = await stripe.refunds.create(
            {
                payment_intent: payment.stripePaymentIntentId,
                amount: refundAmount.requestedAmount,
                reason: normalizedReason,
            },
            { idempotencyKey: stripeIdempotencyKey },
        )
    } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Stripe refund failed. Please retry or inspect the payment incident details.',
            })
        }
        throw error
    }

    if (!isRefundSucceeded(refund.status)) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Stripe refund is not complete. The payment remains paid until Stripe confirms it.',
        })
    }

    const transition = await applyPaymentTransition({
        paymentId: payment.id,
        status: getRefundStatusForAmount(paymentAmountMinor, alreadyRefundedAmount + refund.amount),
        source: 'admin_refund',
        actorId: admin.id,
        request,
        refundId: refund.id,
        refundAmount: refund.amount,
        reason: normalizedReason,
        amount: alreadyRefundedAmount + refund.amount,
        currency: refund.currency,
    })

    return transition?.payment ?? payment
}
