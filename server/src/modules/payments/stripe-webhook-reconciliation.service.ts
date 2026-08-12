import { AppDataSource } from '../../database/data-source.js'
import {
    StripeWebhookEventEntity,
    StripeWebhookEventStatus,
} from '../../entities/booking/stripe-webhook-event.entity.js'
import { recordSystemIncidentSafely } from '../admin/system-incidents.service.js'
import { SystemIncidentType } from '../../entities/system-incident/system-incident.entity.js'
import { getSafeErrorDetail } from '../../shared/errors/safe-error-detail.js'
import { metrics } from '../../shared/observability/metrics.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { getMaintenanceDeleteBatchSize } from '../jobs/maintenance-cleanup-policy.js'
import {
    claimStripeWebhookEvent,
    markStripeWebhookEventFailed,
    markStripeWebhookEventProcessed,
    markStripeWebhookEventUnmatched,
} from './stripe-webhook-event.service.js'
import { getStripeWebhookFailureIncident } from './stripe-webhook-failure.js'
import { getStripeWebhookReplayFailureOutcome } from './stripe-webhook-replay-policy.js'
import { processStripeWebhookEvent } from './stripe-webhook-processor.service.js'

export type StripeWebhookReconciliationResult = {
    checked: number
    applied: number
    unsupported: number
    retryable: number
    failed: number
    skipped: number
}

export async function reconcileUnmatchedStripeWebhooks(
    assertLease?: () => void,
): Promise<StripeWebhookReconciliationResult> {
    const rows = await AppDataSource.getRepository(StripeWebhookEventEntity)
        .createQueryBuilder('event')
        .where(
            `(
                event.status = :unmatchedStatus
                OR (
                    event.status = :processingStatus
                    AND (
                        event.leaseExpiresAt IS NULL
                        OR event.leaseExpiresAt <= CURRENT_TIMESTAMP
                    )
                )
            )`,
            {
                unmatchedStatus: StripeWebhookEventStatus.Unmatched,
                processingStatus: StripeWebhookEventStatus.Processing,
            },
        )
        .orderBy('event.createdAt', 'ASC')
        .take(getMaintenanceDeleteBatchSize())
        .getMany()

    const result: StripeWebhookReconciliationResult = {
        checked: 0,
        applied: 0,
        unsupported: 0,
        retryable: 0,
        failed: 0,
        skipped: 0,
    }

    metrics.setGauge('stripe_webhook_reconciliation_backlog', rows.length)
    metrics.setGauge(
        'stripe_webhook_reconciliation_last_run_at_ms',
        Date.now(),
    )

    for (const storedEvent of rows) {
        assertLease?.()
        const claim = await claimStripeWebhookEvent({
            stripeEventId: storedEvent.stripeEventId,
            eventType: storedEvent.eventType,
        })

        if (!claim.claimed) {
            result.skipped += 1
            continue
        }

        result.checked += 1
        try {
            const event = await stripe.events.retrieve(storedEvent.stripeEventId)
            if (event.id !== storedEvent.stripeEventId || event.type !== storedEvent.eventType) {
                throw new Error('Stripe replay event identity did not match the stored webhook record.')
            }

            const outcome = await processStripeWebhookEvent(event)
            const finalized = await markStripeWebhookEventProcessed(
                claim.eventId,
                claim.leaseToken,
            )
            if (!finalized) {
                result.skipped += 1
                continue
            }

            if (outcome === 'unsupported') {
                result.unsupported += 1
            } else {
                result.applied += 1
            }
        } catch (error: unknown) {
            const errorMessage = getSafeErrorDetail(error, 'Stripe webhook replay failed.')
            const failureOutcome = getStripeWebhookReplayFailureOutcome(error, errorMessage)
            const failurePersisted = failureOutcome === 'retry'
                ? await markStripeWebhookEventUnmatched(claim.eventId, claim.leaseToken, errorMessage)
                : await markStripeWebhookEventFailed(claim.eventId, claim.leaseToken, errorMessage)

            if (!failurePersisted) {
                result.skipped += 1
                continue
            }

            if (failureOutcome === 'retry') {
                result.retryable += 1
            } else {
                result.failed += 1
            }

            await recordSystemIncidentSafely({
                type: SystemIncidentType.PaymentWebhook,
                ...getStripeWebhookFailureIncident({
                    stripeEventId: storedEvent.stripeEventId,
                    stripeEventType: storedEvent.eventType,
                    errorMessage,
                }),
            })
        }
    }

    for (const [outcome, count] of Object.entries(result)) {
        metrics.increment('stripe_webhook_reconciliation_outcomes_total', count, { outcome })
    }
    return result
}
