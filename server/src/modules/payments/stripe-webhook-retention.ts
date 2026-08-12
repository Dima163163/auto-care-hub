export const STRIPE_UNMATCHED_WEBHOOK_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000

export function getStripeUnmatchedWebhookExpiryCutoff(now = new Date()) {
    return new Date(now.getTime() - STRIPE_UNMATCHED_WEBHOOK_RETRY_WINDOW_MS)
}

export function isStripeUnmatchedWebhookExpired(
    createdAt: Date | string,
    now = new Date(),
) {
    return new Date(createdAt).getTime() < getStripeUnmatchedWebhookExpiryCutoff(now).getTime()
}
