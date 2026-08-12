import Stripe from 'stripe'

import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import {
    BookingPaymentDisputeEntity,
    BookingPaymentDisputeStatus,
} from '../../entities/booking/booking-payment-dispute.entity.js'
import { normalizePaymentCurrency } from './payment-input.js'

const DISPUTE_EVENT_TYPES = new Set([
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated',
])

export function isStripeDisputeEventType(eventType: string) {
    return DISPUTE_EVENT_TYPES.has(eventType)
}

export function getPaymentDisputeStatus(
    eventType: string,
    providerStatus?: string | null,
): BookingPaymentDisputeStatus {
    if (eventType === 'charge.dispute.created') return BookingPaymentDisputeStatus.Open
    if (eventType === 'charge.dispute.updated') {
        return ['won', 'lost', 'prevented', 'charge_refunded', 'warning_closed'].includes(providerStatus ?? '')
            ? BookingPaymentDisputeStatus.Closed
            : BookingPaymentDisputeStatus.Open
    }
    if (eventType === 'charge.dispute.funds_withdrawn') return BookingPaymentDisputeStatus.FundsWithdrawn
    if (eventType === 'charge.dispute.funds_reinstated') return BookingPaymentDisputeStatus.FundsReinstated
    if (eventType === 'charge.dispute.closed') return BookingPaymentDisputeStatus.Closed
    throw new Error(`Unsupported Stripe dispute event type: ${eventType}`)
}

export function shouldApplyPaymentDisputeEvent(input: {
    eventCreatedAt: Date
    eventId: string
    lastEventCreatedAt: Date
    lastEventId: string
}) {
    const createdAtComparison = input.eventCreatedAt.getTime() - input.lastEventCreatedAt.getTime()
    if (createdAtComparison !== 0) return createdAtComparison > 0
    return input.eventId > input.lastEventId
}

function getStripeObjectId(value: string | { id: string } | null | undefined) {
    return typeof value === 'string' ? value : value?.id ?? null
}

function getDisputeEventDate(event: Stripe.Event) {
    const eventDate = new Date(event.created * 1_000)
    if (!Number.isFinite(eventDate.getTime())) {
        throw new Error('Stripe dispute event timestamp is invalid.')
    }
    return eventDate
}

function normalizeProviderText(value: string | null | undefined, fallback: string) {
    const normalized = value?.trim() || fallback
    if (normalized.length > 255) throw new Error('Stripe dispute provider text is too long.')
    return normalized
}

export async function recordStripePaymentDisputeEvent(event: Stripe.Event) {
    if (!isStripeDisputeEventType(event.type)) {
        throw new Error(`Unsupported Stripe dispute event type: ${event.type}`)
    }

    const dispute = event.data.object as Stripe.Dispute
    const paymentIntentId = getStripeObjectId(dispute.payment_intent)
    if (!paymentIntentId) throw new Error('Stripe dispute payment intent is missing.')

    const chargeId = getStripeObjectId(dispute.charge)
    const eventCreatedAt = getDisputeEventDate(event)
    const providerStatus = normalizeProviderText(dispute.status, 'unknown')
    const status = getPaymentDisputeStatus(event.type, providerStatus)
    const reason = normalizeProviderText(dispute.reason, 'unknown')
    if (!Number.isSafeInteger(dispute.amount) || dispute.amount < 1) {
        throw new Error('Stripe dispute amount is invalid.')
    }

    return AppDataSource.transaction(async (manager) => {
        const payment = await manager.getRepository(BookingPaymentEntity).findOne({
            where: { stripePaymentIntentId: paymentIntentId },
            lock: { mode: 'pessimistic_read' },
        })
        if (!payment) {
            throw new Error('Stripe dispute payment could not be matched to a stored payment.')
        }

        if (dispute.amount > payment.grossAmount * 100) {
            throw new Error('Stripe dispute amount exceeds the stored payment.')
        }
        if (normalizePaymentCurrency(dispute.currency) !== normalizePaymentCurrency(payment.currency)) {
            throw new Error('Stripe dispute currency does not match the stored payment.')
        }

        const repository = manager.getRepository(BookingPaymentDisputeEntity)
        const existing = await repository.findOne({
            where: { providerDisputeId: dispute.id },
            lock: { mode: 'pessimistic_write' },
        })
        if (existing) {
            if (existing.paymentId !== payment.id) {
                throw new Error('Stripe dispute is already linked to a different payment.')
            }
            if (!shouldApplyPaymentDisputeEvent({
                eventCreatedAt,
                eventId: event.id,
                lastEventCreatedAt: existing.lastEventCreatedAt,
                lastEventId: existing.lastEventId,
            })) {
                return { created: false, updated: false, ignored: true }
            }

            existing.providerChargeId = chargeId ?? existing.providerChargeId
            existing.amountMinor = dispute.amount
            existing.currency = normalizePaymentCurrency(dispute.currency)
            existing.reason = reason
            existing.providerStatus = providerStatus
            existing.status = status
            existing.lastEventId = event.id
            existing.lastEventCreatedAt = eventCreatedAt
            await repository.save(existing)
            return { created: false, updated: true, ignored: false }
        }

        await repository.save(repository.create({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            providerDisputeId: dispute.id,
            providerChargeId: chargeId,
            amountMinor: dispute.amount,
            currency: normalizePaymentCurrency(dispute.currency),
            reason,
            providerStatus,
            status,
            lastEventId: event.id,
            lastEventCreatedAt: eventCreatedAt,
        }))
        return { created: true, updated: false, ignored: false }
    })
}
