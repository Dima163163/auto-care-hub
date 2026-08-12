import Stripe from 'stripe'

import { getReconciliationRetryDecision } from './reconciliation-retry.js'
import { getStripeWebhookFailureDisposition } from './stripe-webhook-outcome-policy.js'

export type StripeWebhookReplayFailureOutcome = 'retry' | 'failed'

export function getStripeWebhookReplayFailureOutcome(
    error: unknown,
    errorMessage: string,
): StripeWebhookReplayFailureOutcome {
    if (getStripeWebhookFailureDisposition(errorMessage) === 'unmatched') {
        return 'retry'
    }

    return error instanceof Stripe.errors.StripeError
        && getReconciliationRetryDecision(error) === 'retry'
        ? 'retry'
        : 'failed'
}
