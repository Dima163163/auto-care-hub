import Stripe from 'stripe'

import {
    getStripeOperationalIncidentTitle,
    processStripeWebhookEvent,
} from './stripe-webhook-processor.service.js'

function refundEvent(paymentIntent: Stripe.Charge['payment_intent']): Stripe.Event {
    return {
        id: 'evt_refund_malformed',
        type: 'charge.refunded',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2026-06-24.dahlia',
        object: 'event',
        data: {
            object: {
                id: 'ch_refund_malformed',
                object: 'charge',
                amount_refunded: 100,
                currency: 'usd',
                payment_intent: paymentIntent,
                refunds: { data: [] },
            } as unknown as Stripe.Charge,
        },
    } as Stripe.Event
}

describe('Stripe webhook processor', () => {
    it('fingerprints operational incident titles by provider event ID', () => {
        const first = getStripeOperationalIncidentTitle({
            kind: 'dispute',
            eventType: 'charge.dispute.created',
            stripeEventId: 'evt_dispute_1',
        })
        const second = getStripeOperationalIncidentTitle({
            kind: 'dispute',
            eventType: 'charge.dispute.created',
            stripeEventId: 'evt_dispute_2',
        })

        expect(first).not.toBe(second)
        expect(first).toBe('Stripe dispute event: charge.dispute.created [evt_dispute_1]')
        expect(getStripeOperationalIncidentTitle({
            kind: 'payout',
            eventType: 'p'.repeat(128),
            stripeEventId: 'evt_' + 'x'.repeat(512),
        })).toHaveLength(232)
    })

    it.each([
        ['null payment intent', null],
        ['expanded payment intent', { id: 'pi_expanded' } as unknown as Stripe.PaymentIntent],
        ['blank payment intent', '   '],
    ])('keeps %s refund events retryable instead of applied', async (_label, paymentIntent) => {
        await expect(processStripeWebhookEvent(refundEvent(paymentIntent))).rejects.toThrow(
            'Stripe refund payment could not be matched to a stored payment.',
        )
    })
})
