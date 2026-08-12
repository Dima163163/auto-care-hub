const SUPPORTED_STRIPE_WEBHOOK_EVENT_TYPES = new Set([
    'checkout.session.completed',
    'checkout.session.async_payment_failed',
    'checkout.session.expired',
    'charge.refunded',
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated',
    'payout.failed',
    'payout.canceled',
    'payout.reversed',
])

export type StripeWebhookEventOutcome = 'applied' | 'unsupported'

export function getStripeWebhookEventOutcome(eventType: string): StripeWebhookEventOutcome {
    return SUPPORTED_STRIPE_WEBHOOK_EVENT_TYPES.has(eventType) ? 'applied' : 'unsupported'
}
