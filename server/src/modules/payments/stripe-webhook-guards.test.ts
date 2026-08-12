import { describe, expect, it } from 'vitest'

import {
    assertStripeWebhookBodyWithinBounds,
    getWebhookRetryHeaders,
    isStripeWebhookEventWithinAge,
    MAX_STRIPE_WEBHOOK_BODY_BYTES,
    MAX_STRIPE_SIGNATURE_HEADER_LENGTH,
    normalizeStripeSignatureHeader,
    normalizeStripeWebhookInput,
} from './stripe-webhook-guards.js'

describe('Stripe webhook input guards', () => {
    it('accepts one bounded signature header and rejects ambiguous input', () => {
        expect(normalizeStripeSignatureHeader(' t=123,v1=abc ')).toBe('t=123,v1=abc')
        expect(normalizeStripeSignatureHeader(['t=123,v1=abc'])).toBe('t=123,v1=abc')
        expect(() => normalizeStripeSignatureHeader(['t=123', 'v1=abc'])).toThrow(/invalid/)
        expect(() => normalizeStripeSignatureHeader('x'.repeat(MAX_STRIPE_SIGNATURE_HEADER_LENGTH + 1)))
            .toThrow(/invalid/)
    })

    it('normalizes valid event identifiers and types', () => {
        expect(normalizeStripeWebhookInput({
            stripeEventId: ' evt_123 ',
            eventType: ' checkout.session.completed ',
        })).toEqual({ stripeEventId: 'evt_123', eventType: 'checkout.session.completed' })
    })

    it('rejects invalid event input before persistence', () => {
        expect(() => normalizeStripeWebhookInput({ stripeEventId: 'evt/1', eventType: 'charge.created' }))
            .toThrow(/invalid/)
        expect(() => normalizeStripeWebhookInput({ stripeEventId: 'evt_1', eventType: 'Charge Created' }))
            .toThrow(/invalid/)
    })

    it('returns bounded private retry headers', () => {
        expect(getWebhookRetryHeaders(10)).toEqual({
            'retry-after': '10',
            'cache-control': 'no-store',
        })
        expect(() => getWebhookRetryHeaders(301)).toThrow(/invalid/)
    })

    it('rejects stale, invalid, and implausibly future events', () => {
        const now = Date.parse('2026-07-28T12:00:00.000Z')
        const recent = Math.floor((now - 60_000) / 1000)
        const stale = Math.floor((now - 25 * 60 * 60 * 1000) / 1000)
        const future = Math.floor((now + 10 * 60 * 1000) / 1000)

        expect(isStripeWebhookEventWithinAge(recent, now)).toBe(true)
        expect(isStripeWebhookEventWithinAge(stale, now)).toBe(false)
        expect(isStripeWebhookEventWithinAge(future, now)).toBe(false)
        expect(isStripeWebhookEventWithinAge('not-a-timestamp', now)).toBe(false)
    })

    it('bounds raw webhook bodies before signature verification', () => {
        expect(assertStripeWebhookBodyWithinBounds(Buffer.from('{"id":"evt_123"}'))).toBeInstanceOf(Buffer)
        expect(() => assertStripeWebhookBodyWithinBounds('')).toThrow(/bounds/)
        expect(() => assertStripeWebhookBodyWithinBounds(Buffer.alloc(MAX_STRIPE_WEBHOOK_BODY_BYTES + 1)))
            .toThrow(/bounds/)
    })
})
