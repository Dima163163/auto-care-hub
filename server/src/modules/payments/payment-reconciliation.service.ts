import Stripe from 'stripe'

import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { OutboxEventEntity } from '../../entities/outbox/outbox-event.entity.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { applyPaymentTransition } from './payment-transition.service.js'
import { metrics } from '../../shared/observability/metrics.js'
import {
    assertReconciliationResult,
    getReconciliationBatchLimit,
    selectReconciliationGaps,
} from './reconciliation-guards.js'
import { getReconciliationRetryDecision } from './reconciliation-retry.js'
import { getMaintenanceBacklogAgeMs } from '../jobs/maintenance-backlog-policy.js'

export type PaymentReconciliationResult = {
    checked: number
    paid: number
    failed: number
    repaired: number
    skipped: number
    errors: number
}

export async function reconcileStripePayments(
    assertLease?: () => void,
): Promise<PaymentReconciliationResult> {
    const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
    const [candidatePayments, candidateCount] = await paymentRepository
        .createQueryBuilder('payment')
        .innerJoin(BookingEntity, 'booking', 'booking.id = payment.bookingId')
        .leftJoin(
            OutboxEventEntity,
            'notification',
            "notification.idempotencyKey = CONCAT('notification:payment:', payment.id, ':', payment.status)",
        )
        .where(`(
            (
                payment.status IN (:...retryStatuses)
                AND payment.stripeSessionId IS NOT NULL
            )
            OR (
                payment.status = :paidStatus
                AND (
                    booking.status = :pendingBookingStatus
                    OR notification.id IS NULL
                )
            )
        )`, {
            retryStatuses: [BookingPaymentStatus.Pending, BookingPaymentStatus.Failed],
            paidStatus: BookingPaymentStatus.Paid,
            pendingBookingStatus: BookingStatus.Pending,
        })
        .orderBy('payment.createdAt', 'ASC')
        .take(getReconciliationBatchLimit())
        .getManyAndCount()
    metrics.setGauge('payment_reconciliation_backlog', candidateCount)
    metrics.setGauge(
        'payment_reconciliation_oldest_age_ms',
        getMaintenanceBacklogAgeMs(candidatePayments[0]?.createdAt),
    )
    const payments = selectReconciliationGaps(candidatePayments, (payment) => ({
        paymentStatus: payment.status,
        stripeSessionId: payment.stripeSessionId,
        // The query above already selected booking and notification gaps.
        bookingStatus: payment.status === BookingPaymentStatus.Paid ? 'pending' : 'confirmed',
        notificationPresent: true,
    }))

    const result: PaymentReconciliationResult = {
        checked: 0,
        paid: 0,
        failed: 0,
        repaired: 0,
        skipped: 0,
        errors: 0,
    }

    for (const payment of payments) {
        assertLease?.()
        const sessionId = payment.stripeSessionId
        result.checked += 1
        try {
            if (!sessionId) {
                result.skipped += 1
                continue
            }

            const session = await stripe.checkout.sessions.retrieve(sessionId)

            if (payment.status === BookingPaymentStatus.Paid) {
                if (session.payment_status !== 'paid' || session.status !== 'complete') {
                    result.skipped += 1
                    continue
                }

                const transition = await applyPaymentTransition({
                    paymentId: payment.id,
                    status: BookingPaymentStatus.Paid,
                    source: 'stripe_reconciliation',
                    stripeSessionId: session.id,
                    stripePaymentIntentId: payment.stripePaymentIntentId ?? undefined,
                    amount: session.amount_total ?? undefined,
                    currency: session.currency ?? undefined,
                })

                if (transition) {
                    result.repaired += 1
                } else {
                    result.skipped += 1
                }
                continue
            }

            if (session.payment_status === 'paid' && session.status === 'complete') {
                await applyPaymentTransition({
                    paymentId: payment.id,
                    status: BookingPaymentStatus.Paid,
                    source: 'stripe_reconciliation',
                    stripeSessionId: session.id,
                    stripePaymentIntentId: typeof session.payment_intent === 'string'
                        ? session.payment_intent
                        : undefined,
                    amount: session.amount_total ?? undefined,
                    currency: session.currency ?? undefined,
                })
                result.paid += 1
                continue
            }

            if (session.status === 'expired') {
                await applyPaymentTransition({
                    paymentId: payment.id,
                    status: BookingPaymentStatus.Failed,
                    source: 'stripe_reconciliation',
                    stripeEventType: 'checkout.session.expired',
                    stripeSessionId: session.id,
                    amount: session.amount_total ?? undefined,
                    currency: session.currency ?? undefined,
                })
                result.failed += 1
                continue
            }

            result.skipped += 1
        } catch (error: unknown) {
            result.errors += 1
            const decision = getReconciliationRetryDecision(error)
            metrics.increment('payment_reconciliation_errors_total', 1, { decision })
            if (decision === 'escalate' || !(error instanceof Stripe.errors.StripeError)) {
                throw error
            }
        }
    }

    assertReconciliationResult(result)
    for (const [outcome, count] of Object.entries(result)) {
        if (outcome === 'checked') continue
        metrics.increment('payment_reconciliation_outcomes_total', count, { outcome })
    }
    metrics.increment('payment_reconciliation_checked_total', result.checked)
    metrics.setGauge('payment_reconciliation_last_errors', result.errors)
    metrics.setGauge('payment_reconciliation_last_run_at_ms', Date.now())

    return result
}
