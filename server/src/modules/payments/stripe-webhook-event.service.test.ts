import { afterAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { StripeWebhookEventEntity } from '../../entities/booking/stripe-webhook-event.entity.js'
import {
    claimStripeWebhookEvent,
    markStripeWebhookEventFailed,
    markStripeWebhookEventProcessed,
    markStripeWebhookEventUnmatched,
} from './stripe-webhook-event.service.js'

describe('Stripe webhook event claiming', () => {
    const stripeEventId = `evt_claim_test_${Date.now()}`

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        await AppDataSource.getRepository(StripeWebhookEventEntity).delete({
            stripeEventId,
        })
    })

    it('allows only one concurrent worker to claim an event', async () => {
        const [first, second] = await Promise.all([
            claimStripeWebhookEvent({
                stripeEventId,
                eventType: 'checkout.session.completed',
            }),
            claimStripeWebhookEvent({
                stripeEventId,
                eventType: 'checkout.session.completed',
            }),
        ])
        const claimed = [first, second].filter((result) => result.claimed)
        const waiting = [first, second].filter((result) => !result.claimed)

        expect(claimed).toHaveLength(1)
        expect(waiting).toHaveLength(1)
        expect(waiting[0]).toMatchObject({
            claimed: false,
            reason: 'in_progress',
        })

        const owner = claimed[0]
        if (!owner?.claimed) throw new Error('Expected one webhook claim owner.')

        expect(await markStripeWebhookEventFailed(
            owner.eventId,
            owner.leaseToken,
            'temporary test failure',
        )).toBe(true)

        const retry = await claimStripeWebhookEvent({
            stripeEventId,
            eventType: 'checkout.session.completed',
        })
        expect(retry.claimed).toBe(true)

        if (!retry.claimed) throw new Error('Expected failed webhook to be reclaimable.')
        expect(await markStripeWebhookEventProcessed(
            retry.eventId,
            retry.leaseToken,
        )).toBe(true)

        const duplicate = await claimStripeWebhookEvent({
            stripeEventId,
            eventType: 'checkout.session.completed',
        })
        expect(duplicate).toMatchObject({
            claimed: false,
            reason: 'processed',
        })
    })

    it('reclaims unmatched events without treating them as processed', async () => {
        const unmatchedEventId = `${stripeEventId}_unmatched`
        const claim = await claimStripeWebhookEvent({
            stripeEventId: unmatchedEventId,
            eventType: 'checkout.session.completed',
        })
        expect(claim.claimed).toBe(true)
        if (!claim.claimed) throw new Error('Expected unmatched test event to be claimed.')

        expect(await markStripeWebhookEventUnmatched(
            claim.eventId,
            claim.leaseToken,
            'Stripe Checkout payment could not be matched to the stored booking.',
        )).toBe(true)

        const retry = await claimStripeWebhookEvent({
            stripeEventId: unmatchedEventId,
            eventType: 'checkout.session.completed',
        })
        expect(retry.claimed).toBe(true)
        if (retry.claimed) {
            await markStripeWebhookEventProcessed(retry.eventId, retry.leaseToken)
        }

        await AppDataSource.getRepository(StripeWebhookEventEntity).delete({
            stripeEventId: unmatchedEventId,
        })
    })
})
