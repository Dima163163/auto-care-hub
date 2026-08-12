import Stripe from 'stripe'

import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { getMaintenanceBacklogAgeMs } from '../jobs/maintenance-backlog-policy.js'
import { metrics } from '../../shared/observability/metrics.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { getReconciliationBatchLimit } from './reconciliation-guards.js'
import { getReconciliationRetryDecision } from './reconciliation-retry.js'
import { getRefundStatusForAmount } from './refund-guards.js'
import { applyPaymentTransition } from './payment-transition.service.js'

export type PaymentRefundReconciliationResult = {
    checked: number
    repaired: number
    skipped: number
    errors: number
}

export function getRefundReconciliationStatuses() {
    return [
        BookingPaymentStatus.Paid,
        BookingPaymentStatus.PartiallyRefunded,
        BookingPaymentStatus.Refunded,
    ] as const
}

export function toRefundLedgerEntries(charge: Pick<Stripe.Charge, 'id' | 'refunds'>) {
    return charge.refunds?.data.map((refund) => ({
        providerRefundId: refund.id,
        providerChargeId: charge.id,
        amountMinor: refund.amount,
        currency: refund.currency,
        reason: refund.reason ?? undefined,
    })) ?? []
}

export async function reconcileStripePaymentRefunds(
    assertLease?: () => void,
): Promise<PaymentRefundReconciliationResult> {
    const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
    const [payments, candidateCount] = await paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status IN (:...statuses)', {
            statuses: getRefundReconciliationStatuses(),
        })
        .andWhere('payment.stripePaymentIntentId IS NOT NULL')
        .orderBy('payment.createdAt', 'ASC')
        .take(getReconciliationBatchLimit())
        .getManyAndCount()

    metrics.setGauge('payment_refund_reconciliation_backlog', candidateCount)
    metrics.setGauge(
        'payment_refund_reconciliation_oldest_age_ms',
        getMaintenanceBacklogAgeMs(payments[0]?.createdAt),
    )

    const result: PaymentRefundReconciliationResult = {
        checked: 0,
        repaired: 0,
        skipped: 0,
        errors: 0,
    }

    for (const payment of payments) {
        assertLease?.()
        result.checked += 1

        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId!)
            const latestCharge = paymentIntent.latest_charge
            const chargeId = typeof latestCharge === 'string'
                ? latestCharge
                : latestCharge?.id

            if (!chargeId) {
                result.skipped += 1
                continue
            }

            const charge = await stripe.charges.retrieve(chargeId, { expand: ['refunds'] })
            if (charge.amount_refunded < 1) {
                result.skipped += 1
                continue
            }

            const transition = await applyPaymentTransition({
                paymentId: payment.id,
                status: getRefundStatusForAmount(payment.grossAmount * 100, charge.amount_refunded),
                source: 'stripe_reconciliation',
                stripePaymentIntentId: payment.stripePaymentIntentId ?? undefined,
                stripeChargeId: charge.id,
                refundEntries: toRefundLedgerEntries(charge),
                amount: charge.amount_refunded,
                currency: charge.currency,
            })

            if (transition?.changed) {
                result.repaired += 1
            } else {
                result.skipped += 1
            }
        } catch (error: unknown) {
            result.errors += 1
            const decision = getReconciliationRetryDecision(error)
            metrics.increment('payment_refund_reconciliation_errors_total', 1, { decision })
            if (decision === 'escalate' || !(error instanceof Stripe.errors.StripeError)) {
                throw error
            }
        }
    }

    for (const [outcome, count] of Object.entries(result)) {
        metrics.increment('payment_refund_reconciliation_outcomes_total', count, { outcome })
    }
    metrics.increment('payment_refund_reconciliation_checked_total', result.checked)
    metrics.setGauge('payment_refund_reconciliation_last_errors', result.errors)
    metrics.setGauge('payment_refund_reconciliation_last_run_at_ms', Date.now())

    return result
}
