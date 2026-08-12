export const MAX_STRIPE_TOTAL_REQUEST_BUDGET_MS = 8 * 60 * 1000

export function assertStripeClientPolicy(input: {
    timeoutMs: number
    maxNetworkRetries: number
}) {
    if (
        !Number.isSafeInteger(input.timeoutMs)
        || input.timeoutMs < 1
        || !Number.isSafeInteger(input.maxNetworkRetries)
        || input.maxNetworkRetries < 0
        || input.timeoutMs * (input.maxNetworkRetries + 1) > MAX_STRIPE_TOTAL_REQUEST_BUDGET_MS
    ) {
        throw new Error('Stripe client timeout policy is invalid.')
    }
}
