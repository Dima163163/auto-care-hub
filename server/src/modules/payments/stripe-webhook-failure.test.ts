import { describe, expect, it } from 'vitest'

import { SystemIncidentSeverity } from '../../entities/system-incident/system-incident.entity.js'
import {
    classifyStripeWebhookFailure,
    getStripeWebhookFailureIncident,
} from './stripe-webhook-failure.js'
import {
    getStripeWebhookFinalizationResult,
    shouldRecordStripeWebhookFailureIncident,
} from './stripe-webhook-lease-policy.js'

describe('Stripe webhook failure incidents', () => {
    it('returns bounded critical metadata for operational alerting', () => {
        const incident = getStripeWebhookFailureIncident({
            stripeEventId: 'evt_123',
            stripeEventType: 'checkout.session.completed',
            errorMessage: 'processing failed',
        })

        expect(incident).toEqual({
            severity: SystemIncidentSeverity.Critical,
            title: 'Stripe webhook failed: evt_123 [processing_failure]',
            metadata: {
                stripeEventId: 'evt_123',
                stripeEventType: 'checkout.session.completed',
                failureClass: 'processing_failure',
                errorMessage: 'processing failed',
            },
        })
    })

    it('bounds provider and error details', () => {
        const incident = getStripeWebhookFailureIncident({
            stripeEventId: 'e'.repeat(600),
            stripeEventType: 't'.repeat(600),
            errorMessage: 'x'.repeat(600),
        })

        expect(incident.metadata.stripeEventId).toHaveLength(512)
        expect(incident.metadata.stripeEventType).toHaveLength(512)
        expect(incident.metadata.errorMessage).toHaveLength(512)
    })

    it('classifies settlement and matching failures without retaining raw details in the title', () => {
        expect(classifyStripeWebhookFailure('Payment transition amount does not match the stored payment.'))
            .toBe('settlement_mismatch')
        expect(classifyStripeWebhookFailure('Stripe Checkout payment could not be matched.'))
            .toBe('unmatched_payment')
        expect(getStripeWebhookFailureIncident({
            stripeEventId: 'evt_123',
            stripeEventType: 'checkout.session.completed',
            errorMessage: 'token=should-not-be-in-title amount mismatch',
        }).title).not.toContain('should-not-be-in-title')
    })

    it('records a failure incident only when the lease owner persisted failure', () => {
        expect(shouldRecordStripeWebhookFailureIncident(true)).toBe(true)
        expect(shouldRecordStripeWebhookFailureIncident(false)).toBe(false)
    })

    it('classifies lease finalization loss separately from persisted outcomes', () => {
        expect(getStripeWebhookFinalizationResult('processed', true)).toBe('processed')
        expect(getStripeWebhookFinalizationResult('failed', true)).toBe('failed')
        expect(getStripeWebhookFinalizationResult('unmatched', true)).toBe('unmatched')
        expect(getStripeWebhookFinalizationResult('failed', false)).toBe('lease_lost')
    })
})
