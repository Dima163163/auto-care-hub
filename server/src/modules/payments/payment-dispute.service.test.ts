import { describe, expect, it } from 'vitest'

import { BookingPaymentDisputeStatus } from '../../entities/booking/booking-payment-dispute.entity.js'
import {
    getPaymentDisputeStatus,
    isStripeDisputeEventType,
    shouldApplyPaymentDisputeEvent,
} from './payment-dispute.service.js'

describe('payment dispute policy', () => {
    it('maps every supported Stripe dispute event to a durable status', () => {
        expect(isStripeDisputeEventType('charge.dispute.created')).toBe(true)
        expect(isStripeDisputeEventType('charge.dispute.updated')).toBe(true)
        expect(getPaymentDisputeStatus('charge.dispute.created')).toBe(BookingPaymentDisputeStatus.Open)
        expect(getPaymentDisputeStatus('charge.dispute.updated', 'won')).toBe(BookingPaymentDisputeStatus.Closed)
        expect(getPaymentDisputeStatus('charge.dispute.updated', 'under_review')).toBe(BookingPaymentDisputeStatus.Open)
        expect(getPaymentDisputeStatus('charge.dispute.funds_withdrawn')).toBe(BookingPaymentDisputeStatus.FundsWithdrawn)
        expect(getPaymentDisputeStatus('charge.dispute.funds_reinstated')).toBe(BookingPaymentDisputeStatus.FundsReinstated)
        expect(getPaymentDisputeStatus('charge.dispute.closed')).toBe(BookingPaymentDisputeStatus.Closed)
        expect(isStripeDisputeEventType('charge.refunded')).toBe(false)
    })

    it('ignores duplicate and older provider events', () => {
        const latest = new Date('2026-01-02T00:00:00.000Z')
        expect(shouldApplyPaymentDisputeEvent({
            eventCreatedAt: latest,
            eventId: 'evt_znew',
            lastEventCreatedAt: latest,
            lastEventId: 'evt_old',
        })).toBe(true)
        expect(shouldApplyPaymentDisputeEvent({
            eventCreatedAt: latest,
            eventId: 'evt_old',
            lastEventCreatedAt: latest,
            lastEventId: 'evt_old',
        })).toBe(false)
        expect(shouldApplyPaymentDisputeEvent({
            eventCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
            eventId: 'evt_latest_id',
            lastEventCreatedAt: latest,
            lastEventId: 'evt_old',
        })).toBe(false)
    })
})
