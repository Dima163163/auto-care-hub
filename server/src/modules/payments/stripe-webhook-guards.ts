import { normalizeStripeIdentifier } from './stripe-identifiers.js'

export const MAX_STRIPE_EVENT_TYPE_LENGTH = 128
export const MAX_STRIPE_WEBHOOK_EVENT_AGE_MS = 24 * 60 * 60 * 1000
export const MAX_STRIPE_WEBHOOK_CLOCK_SKEW_MS = 5 * 60 * 1000
export const MAX_STRIPE_WEBHOOK_BODY_BYTES = 2 * 1024 * 1024
export const MAX_STRIPE_SIGNATURE_HEADER_LENGTH = 2048

export function normalizeStripeSignatureHeader(value: unknown) {
    const signature = Array.isArray(value)
        ? value.length === 1 ? value[0] : null
        : value
    const normalized = typeof signature === 'string' ? signature.trim() : ''

    if (
        normalized.length < 1
        || normalized.length > MAX_STRIPE_SIGNATURE_HEADER_LENGTH
    ) {
        throw new Error('Stripe webhook signature header is invalid.')
    }

    return normalized
}

export function assertStripeWebhookBodyWithinBounds(body: Buffer | string) {
    const bytes = Buffer.byteLength(body)
    if (bytes < 1 || bytes > MAX_STRIPE_WEBHOOK_BODY_BYTES) {
        throw new Error('Stripe webhook body is outside accepted bounds.')
    }
    return body
}

export function normalizeStripeWebhookInput(input: {
    stripeEventId: unknown
    eventType: unknown
}) {
    const stripeEventId = normalizeStripeIdentifier(input.stripeEventId, 'stripeEventId')
    const eventType = typeof input.eventType === 'string' ? input.eventType.trim() : ''

    if (!stripeEventId || eventType.length < 1 || eventType.length > MAX_STRIPE_EVENT_TYPE_LENGTH || !/^[a-z0-9_.]+$/.test(eventType)) {
        throw new Error('Stripe webhook event input is invalid.')
    }

    return { stripeEventId, eventType }
}

export function getWebhookRetryHeaders(retryAfterSeconds = 5) {
    if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 1 || retryAfterSeconds > 300) {
        throw new Error('Webhook retry delay is invalid.')
    }

    return {
        'retry-after': String(retryAfterSeconds),
        'cache-control': 'no-store',
    } as const
}

export function isStripeWebhookEventWithinAge(
    createdAtSeconds: unknown,
    now = Date.now(),
    maxAgeMs = MAX_STRIPE_WEBHOOK_EVENT_AGE_MS,
) {
    if (
        typeof createdAtSeconds !== 'number'
        || !Number.isSafeInteger(createdAtSeconds)
        || createdAtSeconds < 0
    ) {
        return false
    }

    if (!Number.isFinite(now) || !Number.isFinite(maxAgeMs) || maxAgeMs < 1) {
        return false
    }

    const ageMs = now - createdAtSeconds * 1000
    return ageMs <= maxAgeMs && ageMs >= -MAX_STRIPE_WEBHOOK_CLOCK_SKEW_MS
}
