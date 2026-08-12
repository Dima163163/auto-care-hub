import { randomUUID } from 'node:crypto'

import { AppDataSource } from '../../database/data-source.js'
import {
    StripeWebhookEventEntity,
    StripeWebhookEventStatus,
} from '../../entities/booking/stripe-webhook-event.entity.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getSafeErrorDetail } from '../../shared/errors/safe-error-detail.js'
import { normalizeStripeWebhookInput } from './stripe-webhook-guards.js'
import { getStripeWebhookFinalizationResult } from './stripe-webhook-lease-policy.js'

export const STRIPE_WEBHOOK_PROCESSING_LEASE_MS = 5 * 60_000

type ClaimRow = {
    id: string
    lease_token: string
    created_at: Date | string
}

type ReturningMutationResult = [Array<{ id: string }>, number]

export type StripeWebhookClaim =
    | {
        claimed: true
        eventId: string
        leaseToken: string
    }
    | {
        claimed: false
        eventId: string
        reason: 'processed' | 'in_progress'
    }

export async function claimStripeWebhookEvent(input: {
    stripeEventId: string
    eventType: string
}): Promise<StripeWebhookClaim> {
    const normalizedInput = normalizeStripeWebhookInput(input)
    const leaseToken = randomUUID()

    return AppDataSource.transaction(async (manager) => {
        const rows = await manager.query(
            `
                INSERT INTO "stripe_webhook_events" (
                    "stripe_event_id",
                    "event_type",
                    "status",
                    "processed_at",
                    "last_error",
                    "lease_token",
                    "lease_expires_at"
                )
                VALUES ($1, $2, 'processing', NULL, NULL, $3,
                    NOW() + ($4 * INTERVAL '1 millisecond'))
                ON CONFLICT ("stripe_event_id") DO UPDATE SET
                    "event_type" = EXCLUDED."event_type",
                    "status" = 'processing',
                    "processed_at" = NULL,
                    "last_error" = NULL,
                    "lease_token" = EXCLUDED."lease_token",
                    "lease_expires_at" = NOW() + ($4 * INTERVAL '1 millisecond')
                WHERE "stripe_webhook_events"."status" IN ('failed', 'unmatched')
                   OR (
                       "stripe_webhook_events"."status" = 'processing'
                       AND (
                           "stripe_webhook_events"."lease_expires_at" IS NULL
                           OR "stripe_webhook_events"."lease_expires_at" <= NOW()
                       )
                   )
                RETURNING "id", "lease_token", "created_at"
            `,
            [normalizedInput.stripeEventId, normalizedInput.eventType, leaseToken, STRIPE_WEBHOOK_PROCESSING_LEASE_MS],
        ) as ClaimRow[]

        const [row] = rows
        if (row) {
            metrics.increment('stripe_webhook_claims_total', 1, { result: 'claimed' })
            recordWebhookAge(row.created_at)
            return {
                claimed: true,
                eventId: row.id,
                leaseToken: row.lease_token,
            }
        }

        const existing = await manager.getRepository(StripeWebhookEventEntity).findOneByOrFail({
            stripeEventId: normalizedInput.stripeEventId,
        })

        const reason = existing.status === StripeWebhookEventStatus.Processed
            ? 'processed'
            : 'in_progress'
        metrics.increment('stripe_webhook_claims_total', 1, { result: reason })
        recordWebhookAge(existing.createdAt)

        return {
            claimed: false,
            eventId: existing.id,
            reason,
        }
    })
}

export async function markStripeWebhookEventProcessed(
    eventId: string,
    leaseToken: string,
) {
    const [rows] = await AppDataSource.query(
        `
            UPDATE "stripe_webhook_events"
            SET
                "status" = 'processed',
                "processed_at" = NOW(),
                "last_error" = NULL,
                "lease_token" = NULL,
                "lease_expires_at" = NULL
            WHERE "id" = $1
              AND "lease_token" = $2
              AND "status" = 'processing'
            RETURNING "id"
        `,
        [eventId, leaseToken],
    ) as ReturningMutationResult

    const processed = rows.length === 1
    metrics.increment('stripe_webhook_finalization_total', 1, {
        outcome: getStripeWebhookFinalizationResult('processed', processed),
    })
    if (processed) {
        metrics.increment('stripe_webhook_processed_total')
    }
    return processed
}

export async function markStripeWebhookEventFailed(
    eventId: string,
    leaseToken: string,
    errorMessage: string,
) {
    const [rows] = await AppDataSource.query(
        `
            UPDATE "stripe_webhook_events"
            SET
                "status" = 'failed',
                "processed_at" = NULL,
                "last_error" = $3,
                "lease_token" = NULL,
                "lease_expires_at" = NULL
            WHERE "id" = $1
              AND "lease_token" = $2
              AND "status" = 'processing'
            RETURNING "id"
        `,
            [eventId, leaseToken, getSafeErrorDetail(new Error(errorMessage), 'Stripe webhook failed.')],
    ) as ReturningMutationResult

    const failed = rows.length === 1
    metrics.increment('stripe_webhook_finalization_total', 1, {
        outcome: getStripeWebhookFinalizationResult('failed', failed),
    })
    if (failed) {
        metrics.increment('stripe_webhook_failed_total')
    }
    return failed
}

export async function markStripeWebhookEventUnmatched(
    eventId: string,
    leaseToken: string,
    errorMessage: string,
) {
    const [rows] = await AppDataSource.query(
        `
            UPDATE "stripe_webhook_events"
            SET
                "status" = 'unmatched',
                "processed_at" = NULL,
                "last_error" = $3,
                "lease_token" = NULL,
                "lease_expires_at" = NULL
            WHERE "id" = $1
              AND "lease_token" = $2
              AND "status" = 'processing'
            RETURNING "id"
        `,
        [eventId, leaseToken, getSafeErrorDetail(new Error(errorMessage), 'Stripe webhook unmatched.')],
    ) as ReturningMutationResult

    const unmatched = rows.length === 1
    metrics.increment('stripe_webhook_finalization_total', 1, {
        outcome: getStripeWebhookFinalizationResult('unmatched', unmatched),
    })
    if (unmatched) {
        metrics.increment('stripe_webhook_unmatched_total')
    }
    return unmatched
}

function recordWebhookAge(createdAt: Date | string) {
    const ageMs = Date.now() - new Date(createdAt).getTime()
    if (Number.isFinite(ageMs) && ageMs >= 0) {
        metrics.observe('stripe_webhook_processing_age_ms', ageMs)
    }
}
