import {
    SystemIncidentSeverity,
} from '../../entities/system-incident/system-incident.entity.js'

const MAX_STRIPE_WEBHOOK_FAILURE_DETAIL_LENGTH = 512

export type StripeWebhookFailureClass =
    | 'invalid_metadata'
    | 'settlement_mismatch'
    | 'unmatched_payment'
    | 'processing_failure'

export function classifyStripeWebhookFailure(errorMessage: string): StripeWebhookFailureClass {
    const normalized = errorMessage.toLowerCase()
    if (normalized.includes('metadata')) return 'invalid_metadata'
    if (normalized.includes('amount') || normalized.includes('currency')) return 'settlement_mismatch'
    if (normalized.includes('matched') || normalized.includes('payment')) return 'unmatched_payment'
    return 'processing_failure'
}

export function getStripeWebhookFailureIncident(input: {
    stripeEventId: string
    stripeEventType: string
    errorMessage: string
}) {
    const failureClass = classifyStripeWebhookFailure(input.errorMessage)
    return {
        severity: SystemIncidentSeverity.Critical,
        title: `Stripe webhook failed: ${input.stripeEventId.slice(0, 160)} [${failureClass}]`,
        metadata: {
            stripeEventId: input.stripeEventId.slice(0, MAX_STRIPE_WEBHOOK_FAILURE_DETAIL_LENGTH),
            stripeEventType: input.stripeEventType.slice(0, MAX_STRIPE_WEBHOOK_FAILURE_DETAIL_LENGTH),
            failureClass,
            errorMessage: input.errorMessage.slice(0, MAX_STRIPE_WEBHOOK_FAILURE_DETAIL_LENGTH),
        },
    } as const
}
