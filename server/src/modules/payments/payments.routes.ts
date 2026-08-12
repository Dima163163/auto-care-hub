import type { FastifyInstance, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import { requireAuth } from '../auth/require-auth.js'
import { validateParams } from '../../shared/validation/validate.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { z } from 'zod'
import { AppDataSource } from '../../database/data-source.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import { calculateBookingCommission, calculateOwnerPayout } from '../commission/commission.service.js'
import { recordSystemIncidentSafely } from '../admin/system-incidents.service.js'
import {
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { recordSecurityActivitySafely } from '../auth/security-event-stream.js'
import {
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import {
    completeCheckoutAttempt,
    failCheckoutAttempt,
    reserveCheckoutAttempt,
} from './payment-attempt.service.js'
import { getClientBookingPaymentStatus } from './payment-status.service.js'
import {
    claimStripeWebhookEvent,
    markStripeWebhookEventFailed,
    markStripeWebhookEventProcessed,
    markStripeWebhookEventUnmatched,
} from './stripe-webhook-event.service.js'
import {
    assertStripeWebhookBodyWithinBounds,
    getWebhookRetryHeaders,
    isStripeWebhookEventWithinAge,
    normalizeStripeSignatureHeader,
} from './stripe-webhook-guards.js'
import { classifyStripeFailure } from './stripe-failure.js'
import { getStripeWebhookFailureIncident } from './stripe-webhook-failure.js'
import { getSafeErrorDetail } from '../../shared/errors/safe-error-detail.js'
import { toStripeMinorUnits } from './payment-money.js'
import { shouldRecordStripeWebhookFailureIncident } from './stripe-webhook-lease-policy.js'
import { getStripeWebhookFailureDisposition } from './stripe-webhook-outcome-policy.js'
import { processStripeWebhookEvent } from './stripe-webhook-processor.service.js'
import { getOwnerReadiness } from './owner-readiness.service.js'
import {
    recordOwnerCheckoutBlockedMetric,
    recordOwnerReadinessMetrics,
} from './owner-readiness-metrics.js'

type StripeWebhookRequest = FastifyRequest & {
    rawBody?: Buffer | string
}

function isRetryableCheckoutError(error: unknown) {
    return classifyStripeFailure(error) === 'transient'
}

const bookingPaymentParamsSchema = z.object({
    id: z.string().uuid(),
})

export async function paymentsRoutes(app: FastifyInstance) {
    app.get('/owner/readiness', async (request) => {
        const user = await requireAuth(request)

        if (user.role !== UserRole.Owner) {
            throw new AppError({
                statusCode: 403,
                code: ERROR_CODES.Forbidden,
                message: 'Only owners can view owner readiness.',
            })
        }

        const readiness = await getOwnerReadiness(user)
        recordOwnerReadinessMetrics(readiness)
        return readiness
    })

    app.get('/bookings/:id/payment/status', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(bookingPaymentParamsSchema, request.params)

        return getClientBookingPaymentStatus(user, params.id)
    })

    app.post('/bookings/:id/payment/checkout', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(bookingPaymentParamsSchema, request.params)
        const booking = await AppDataSource.getRepository(BookingEntity).findOne({
            where: { id: params.id, clientId: user.id },
            relations: { service: true, cabinet: true },
        })

        if (!booking || booking.status === BookingStatus.Cancelled) {
            throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Bookable booking not found.' })
        }

        const owner = await AppDataSource.getRepository(UserEntity).findOneBy({ id: booking.cabinet.ownerId })
        if (!owner) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'This booking is not ready for payment.' })
        }

        const ownerStripeAccountId = owner.stripeConnectAccountId
        const ownerReadiness = await getOwnerReadiness(owner)
        recordOwnerReadinessMetrics(ownerReadiness)
        if (!ownerReadiness.ready || !ownerStripeAccountId) {
            recordOwnerCheckoutBlockedMetric()
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'This booking cannot enter payment until the cabinet owner completes the required setup.',
            })
        }

        const grossAmount = booking.service.price
        const commissionAmount = calculateBookingCommission(grossAmount)
        const ownerPayoutAmount = calculateOwnerPayout(grossAmount)

        const reservation = await reserveCheckoutAttempt({
            bookingId: booking.id,
            clientIdempotencyKey: getOptionalIdempotencyKey(request.headers),
            grossAmount,
            commissionAmount,
            ownerPayoutAmount,
            currency: 'eur',
        })

        if (reservation.status === 'failed') {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: reservation.failureMessage,
            })
        }

        if (reservation.status === 'ready') {
            return {
                url: reservation.checkoutUrl,
                attemptId: reservation.attemptId,
                reused: true,
            }
        }

        let session: Stripe.Checkout.Session
        try {
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                customer_email: user.email,
                line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: { name: `${booking.service.title} · ${booking.cabinet.title}` },
                        unit_amount: toStripeMinorUnits(grossAmount),
                    },
                    quantity: 1,
                }],
                payment_intent_data: {
                    application_fee_amount: commissionAmount * 100,
                    transfer_data: { destination: ownerStripeAccountId },
                },
                metadata: {
                    bookingId: booking.id,
                    paymentId: reservation.paymentId,
                    paymentAttemptId: reservation.attemptId,
                },
                success_url: `${env.frontendOrigin}/profile/bookings?payment=success&booking_id=${booking.id}`,
                cancel_url: `${env.frontendOrigin}/profile/bookings?payment=cancelled&booking_id=${booking.id}`,
            }, {
                idempotencyKey: reservation.stripeIdempotencyKey,
            })
        } catch (error) {
            if (!isRetryableCheckoutError(error)) {
                await failCheckoutAttempt({
                    attemptId: reservation.attemptId,
                    failureMessage: getSafeErrorDetail(error, 'Stripe Checkout creation failed.'),
                })
            }

            if (
                error instanceof Stripe.errors.StripeError
                && error.message.includes('missing the required capabilities')
            ) {
                throw new AppError({
                    statusCode: 409,
                    code: ERROR_CODES.Conflict,
                    message: 'The owner must complete Stripe Connect onboarding before accepting payments.',
                })
            }

            throw error
        }

        if (!session.url) {
            throw new AppError({
                statusCode: 502,
                code: ERROR_CODES.InternalServerError,
                message: 'Payment checkout could not be prepared.',
            })
        }

        const completedAttempt = await completeCheckoutAttempt({
            attemptId: reservation.attemptId,
            paymentId: reservation.paymentId,
            stripeSessionId: session.id,
            checkoutUrl: session.url,
        })

        return {
            url: completedAttempt.attempt.checkoutUrl ?? session.url,
            attemptId: completedAttempt.attempt.id,
            reused: reservation.reused,
        }
    })

    app.post('/owner/stripe-connect/onboarding', async (request) => {
        const user = await requireAuth(request)

        if (user.role !== UserRole.Owner) {
            throw new AppError({
                statusCode: 403,
                code: ERROR_CODES.Forbidden,
                message: 'Only owners can connect a payout account.',
            })
        }

        const userRepository = AppDataSource.getRepository(UserEntity)
        let accountId = user.stripeConnectAccountId

        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            })
            accountId = account.id
            user.stripeConnectAccountId = accountId
            await userRepository.save(user)
        }

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${env.frontendOrigin}/owner/stripe-connect/refresh`,
            return_url: `${env.frontendOrigin}/owner/stripe-connect/complete`,
            type: 'account_onboarding',
        })

        return { url: accountLink.url }
    })

    app.get('/owner/stripe-connect/status', async (request) => {
        const user = await requireAuth(request)

        if (user.role !== UserRole.Owner) {
            throw new AppError({
                statusCode: 403,
                code: ERROR_CODES.Forbidden,
                message: 'Only owners can view payout account status.',
            })
        }

        if (!user.stripeConnectAccountId) {
            return {
                connected: false,
                detailsSubmitted: false,
                chargesEnabled: false,
                payoutsEnabled: false,
            }
        }

        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)

        return {
            connected: true,
            detailsSubmitted: Boolean(account.details_submitted),
            chargesEnabled: Boolean(account.charges_enabled),
            payoutsEnabled: Boolean(account.payouts_enabled),
        }
    })

    app.post('/webhooks/stripe', async (request, reply) => {
        const rawBody = (request as StripeWebhookRequest).rawBody
        let signature: string

        try {
            signature = normalizeStripeSignatureHeader(request.headers['stripe-signature'])
        } catch {
            void recordSecurityActivitySafely({
                type: SecurityEventType.WebhookAbuse,
                severity: SecurityEventSeverity.High,
                statusCode: 400,
                request,
                metadata: { reason: 'missing_or_invalid_signature_header' },
            })
            return reply.status(400).send('Missing signature or raw body')
        }

        if (!rawBody) {
            void recordSecurityActivitySafely({
                type: SecurityEventType.WebhookAbuse,
                severity: SecurityEventSeverity.High,
                statusCode: 400,
                request,
                metadata: { reason: 'missing_raw_body' },
            })
            return reply.status(400).send('Missing signature or raw body')
        }

        try {
            assertStripeWebhookBodyWithinBounds(rawBody)
        } catch {
            void recordSecurityActivitySafely({
                type: SecurityEventType.WebhookAbuse,
                severity: SecurityEventSeverity.High,
                statusCode: 413,
                request,
                metadata: { reason: 'webhook_body_limit_exceeded' },
            })
            return reply.status(413).send({
                received: false,
                error: 'Webhook body exceeds the accepted size limit.',
            })
        }

        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                env.stripe.webhookSecret
            )
        } catch {
            void recordSecurityActivitySafely({
                type: SecurityEventType.WebhookAbuse,
                severity: SecurityEventSeverity.High,
                statusCode: 400,
                request,
                metadata: { reason: 'signature_verification_failed' },
            })
            app.log.warn(
                { reason: 'signature_verification_failed' },
                'Stripe webhook signature verification failed',
            )
            return reply.status(400).send({
                received: false,
                error: 'Webhook signature verification failed.',
            })
        }

        if (!isStripeWebhookEventWithinAge(event.created)) {
            void recordSecurityActivitySafely({
                type: SecurityEventType.WebhookAbuse,
                severity: SecurityEventSeverity.Warning,
                statusCode: 400,
                request,
                metadata: { reason: 'webhook_event_outside_age_window' },
            })
            app.log.warn(
                { stripeEventId: event.id, stripeEventType: event.type },
                'Stripe webhook event is outside the accepted age window',
            )
            return reply.status(400).send({
                received: false,
                error: 'Webhook event is outside the accepted age window.',
            })
        }

        const claim = await claimStripeWebhookEvent({
            stripeEventId: event.id,
            eventType: event.type,
        })

        if (!claim.claimed) {
            if (claim.reason === 'in_progress') {
                return reply
                    .status(409)
                    .headers(getWebhookRetryHeaders())
                    .send({ received: false, inProgress: true })
            }

            return reply.status(200).send({
                received: true,
                outcome: 'duplicate',
                duplicate: true,
            })
        }

        try {
            const eventOutcome = await processStripeWebhookEvent(event)

            const finalized = await markStripeWebhookEventProcessed(
                claim.eventId,
                claim.leaseToken,
            )

            if (!finalized) {
                app.log.warn(
                    { stripeEventId: event.id },
                    'Stripe webhook lease was lost before completion',
                )
                return reply.status(200).send({ received: true, leaseLost: true })
            }

            return reply.status(200).send({ received: true, outcome: eventOutcome })
        } catch (error: unknown) {
            const errorMessage = getSafeErrorDetail(error, 'Unknown webhook error')
            const disposition = getStripeWebhookFailureDisposition(errorMessage)
            const failurePersisted = disposition === 'unmatched'
                ? await markStripeWebhookEventUnmatched(claim.eventId, claim.leaseToken, errorMessage)
                : await markStripeWebhookEventFailed(claim.eventId, claim.leaseToken, errorMessage)

            if (!shouldRecordStripeWebhookFailureIncident(failurePersisted)) {
                app.log.warn(
                    { stripeEventId: event.id },
                    'Stripe webhook lease was lost while recording failure',
                )
                return reply.status(200).send({ received: true, leaseLost: true })
            }

            const incident = getStripeWebhookFailureIncident({
                stripeEventId: event.id,
                stripeEventType: event.type,
                errorMessage,
            })
            await recordSystemIncidentSafely({
                type: SystemIncidentType.PaymentWebhook,
                ...incident,
                requestId: request.id,
            })

            if (disposition === 'unmatched') {
                return reply.status(409).send({
                    received: false,
                    outcome: 'unmatched',
                    retryable: true,
                })
            }

            throw error
        }
    })
}
