import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import {
    assertPaymentTransitionIdentity,
    assertPaymentTransitionMetadata,
} from './payment-transition-input.js'
import {
    assertStripeCheckoutMetadata,
} from './stripe-checkout-settlement.js'

const stripe = new Stripe('sk_test_autocarehub_signature', {
    apiVersion: '2026-06-24.dahlia',
})

describe('Stripe webhook signature contract', () => {
    it('accepts the exact raw payload signed with the configured secret', () => {
        const payload = JSON.stringify({
            id: 'evt_test_signed',
            object: 'event',
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_test_signed' } },
        })
        const secret = 'whsec_autocarehub_signature'
        const signature = stripe.webhooks.generateTestHeaderString({
            payload,
            secret,
            timestamp: Math.floor(Date.now() / 1000),
        })

        const event = stripe.webhooks.constructEvent(payload, signature, secret)

        expect(event.id).toBe('evt_test_signed')
        expect(event.type).toBe('checkout.session.completed')
    })

    it('rejects a payload changed after signing', () => {
        const payload = JSON.stringify({ id: 'evt_test_tampered', object: 'event' })
        const secret = 'whsec_autocarehub_signature'
        const signature = stripe.webhooks.generateTestHeaderString({
            payload,
            secret,
            timestamp: Math.floor(Date.now() / 1000),
        })

        expect(() => stripe.webhooks.constructEvent(`${payload} `, signature, secret))
            .toThrow()
    })

    it('keeps settlement validation attached to the signed raw payload', () => {
        const bookingId = '123e4567-e89b-42d3-a456-426614174000'
        const paymentId = '223e4567-e89b-42d3-a456-426614174000'
        const payload = JSON.stringify({
            id: 'evt_test_signed_settlement',
            object: 'event',
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test_signed_settlement',
                    metadata: { bookingId, paymentId },
                    amount_total: 2_500,
                    currency: 'eur',
                },
            },
        })
        const secret = 'whsec_autocarehub_signature'
        const signature = stripe.webhooks.generateTestHeaderString({
            payload,
            secret,
            timestamp: Math.floor(Date.now() / 1000),
        })
        const event = stripe.webhooks.constructEvent(payload, signature, secret)
        const session = event.data.object as {
            metadata?: Record<string, string>
            amount_total?: number
            currency?: string
        }

        const metadata = assertStripeCheckoutMetadata(session.metadata)
        expect(metadata).toEqual({ bookingId, paymentId })
        expect(() => assertPaymentTransitionIdentity({
            requestedPaymentId: paymentId,
            requestedBookingId: bookingId,
            storedPaymentId: '323e4567-e89b-42d3-a456-426614174000',
            storedBookingId: bookingId,
        })).toThrow(/does not match/)
        expect(() => assertPaymentTransitionIdentity({
            requestedPaymentId: paymentId,
            requestedBookingId: bookingId,
            storedPaymentId: paymentId,
            storedBookingId: '423e4567-e89b-42d3-a456-426614174000',
        })).toThrow(/does not match/)
        expect(() => assertPaymentTransitionMetadata({
            status: BookingPaymentStatus.Paid,
            amount: session.amount_total,
            currency: 'usd',
            expectedAmount: 25,
            expectedCurrency: session.currency ?? 'eur',
        })).toThrow(/currency/)
        expect(() => assertPaymentTransitionMetadata({
            status: BookingPaymentStatus.Paid,
            amount: 2_499,
            currency: session.currency,
            expectedAmount: 25,
            expectedCurrency: session.currency ?? 'eur',
        })).toThrow(/does not match/)
    })

    it('rejects malformed metadata from a validly signed event', () => {
        const payload = JSON.stringify({
            id: 'evt_test_signed_bad_metadata',
            object: 'event',
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_test_bad_metadata', metadata: { bookingId: 'wrong' } } },
        })
        const secret = 'whsec_autocarehub_signature'
        const signature = stripe.webhooks.generateTestHeaderString({
            payload,
            secret,
            timestamp: Math.floor(Date.now() / 1000),
        })
        const event = stripe.webhooks.constructEvent(payload, signature, secret)

        expect(() => assertStripeCheckoutMetadata(
            (event.data.object as { metadata?: Record<string, string> }).metadata,
        )).toThrow(/missing or invalid/)
    })
})
