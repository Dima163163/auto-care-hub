import Stripe from 'stripe'

import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { recordSystemIncidentSafely } from '../admin/system-incidents.service.js'
import {
    SystemIncidentSeverity,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { applyPaymentTransition } from './payment-transition.service.js'
import {
    assertPaymentTransitionMatched,
    assertStripeCheckoutMetadata,
} from './stripe-checkout-settlement.js'
import { getStripeWebhookEventOutcome } from './stripe-webhook-event-type-policy.js'
import { getRefundStatusForAmount } from './refund-guards.js'
import { isStripeDisputeEventType, recordStripePaymentDisputeEvent } from './payment-dispute.service.js'

export type StripeWebhookProcessingOutcome = 'applied' | 'unsupported'

type StripeOperationalIncidentKind = 'dispute' | 'payout'

export function getStripeOperationalIncidentTitle(input: {
    kind: StripeOperationalIncidentKind
    eventType: string
    stripeEventId: string
}) {
    return `Stripe ${input.kind} event: ${input.eventType} [${input.stripeEventId.slice(0, 80)}]`
}

async function recordStripeOperationalIncident(event: Stripe.Event) {
    const disputeEventTypes = new Set([
        'charge.dispute.created',
        'charge.dispute.updated',
        'charge.dispute.closed',
        'charge.dispute.funds_withdrawn',
        'charge.dispute.funds_reinstated',
    ])
    const payoutEventTypes = new Set([
        'payout.failed',
        'payout.canceled',
        'payout.reversed',
    ])

    if (disputeEventTypes.has(event.type)) {
        const dispute = event.data.object as Stripe.Dispute
        const paymentIntentId = typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : null

        await recordSystemIncidentSafely({
            type: SystemIncidentType.PaymentWebhook,
            severity: event.type.includes('funds_withdrawn') || event.type.includes('created')
                ? SystemIncidentSeverity.Critical
                : SystemIncidentSeverity.Warning,
            title: getStripeOperationalIncidentTitle({
                kind: 'dispute',
                eventType: event.type,
                stripeEventId: event.id,
            }),
            metadata: {
                stripeEventId: event.id,
                stripeEventType: event.type,
                disputeId: dispute.id,
                status: dispute.status,
                paymentIntentId,
                chargeId: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id,
                amount: dispute.amount,
                currency: dispute.currency,
                reason: dispute.reason,
            },
        })
        return
    }

    if (payoutEventTypes.has(event.type)) {
        const payout = event.data.object as Stripe.Payout

        await recordSystemIncidentSafely({
            type: SystemIncidentType.PaymentWebhook,
            severity: event.type === 'payout.failed'
                ? SystemIncidentSeverity.Critical
                : SystemIncidentSeverity.Warning,
            title: getStripeOperationalIncidentTitle({
                kind: 'payout',
                eventType: event.type,
                stripeEventId: event.id,
            }),
            metadata: {
                stripeEventId: event.id,
                stripeEventType: event.type,
                payoutId: payout.id,
                status: payout.status,
                amount: payout.amount,
                currency: payout.currency,
                failureCode: payout.failure_code,
                failureMessage: payout.failure_message,
            },
        })
    }
}

export async function processStripeWebhookEvent(
    event: Stripe.Event,
): Promise<StripeWebhookProcessingOutcome> {
    const eventOutcome = getStripeWebhookEventOutcome(event.type)
    if (eventOutcome === 'unsupported') return eventOutcome

    await recordStripeOperationalIncident(event)

    if (isStripeDisputeEventType(event.type)) {
        await recordStripePaymentDisputeEvent(event)
    }

    if (
        event.type === 'checkout.session.completed'
        || event.type === 'checkout.session.async_payment_failed'
        || event.type === 'checkout.session.expired'
    ) {
        const session = event.data.object as Stripe.Checkout.Session
        const { bookingId, paymentId } = assertPaymentTransitionMatched(
            assertStripeCheckoutMetadata(session.metadata),
        )
        const transition = await applyPaymentTransition({
            bookingId,
            paymentId,
            status: event.type === 'checkout.session.completed'
                ? BookingPaymentStatus.Paid
                : BookingPaymentStatus.Failed,
            source: 'stripe_webhook',
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeSessionId: session.id,
            stripePaymentIntentId: event.type === 'checkout.session.completed'
                && typeof session.payment_intent === 'string'
                ? session.payment_intent
                : undefined,
            amount: session.amount_total ?? undefined,
            currency: session.currency ?? undefined,
        })
        assertPaymentTransitionMatched(transition)
    }

    if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = typeof charge.payment_intent === 'string'
            ? charge.payment_intent.trim()
            : null

        if (!paymentIntentId) {
            throw new Error('Stripe refund payment could not be matched to a stored payment.')
        }

        const payment = await AppDataSource.getRepository(BookingPaymentEntity).findOneBy({
            stripePaymentIntentId: paymentIntentId,
        })

        if (!payment) {
            throw new Error('Stripe refund payment could not be matched to a stored payment.')
        }

        await applyPaymentTransition({
            paymentId: payment.id,
            status: getRefundStatusForAmount(
                payment.grossAmount * 100,
                charge.amount_refunded,
            ),
            source: 'stripe_webhook',
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeChargeId: charge.id,
            refundEntries: charge.refunds?.data.map((refund) => ({
                providerRefundId: refund.id,
                providerChargeId: charge.id,
                amountMinor: refund.amount,
                currency: refund.currency,
                reason: refund.reason ?? undefined,
            })),
            amount: charge.amount_refunded,
            currency: charge.currency,
        })
    }

    return eventOutcome
}
