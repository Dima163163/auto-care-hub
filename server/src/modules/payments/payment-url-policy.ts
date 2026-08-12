export const MAX_PAYMENT_CHECKOUT_URL_LENGTH = 2_048

export function assertPaymentCheckoutUrl(value: string) {
    if (value.length < 1 || value.length > MAX_PAYMENT_CHECKOUT_URL_LENGTH) {
        throw new Error('Payment checkout URL is invalid.')
    }

    let parsed: URL
    try {
        parsed = new URL(value)
    } catch {
        throw new Error('Payment checkout URL is invalid.')
    }

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname) {
        throw new Error('Payment checkout URL is invalid.')
    }

    if (parsed.hostname !== 'checkout.stripe.com' && !parsed.hostname.endsWith('.stripe.com')) {
        throw new Error('Payment checkout URL is invalid.')
    }

    return parsed.toString()
}
