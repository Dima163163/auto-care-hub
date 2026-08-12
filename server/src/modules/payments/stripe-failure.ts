export type StripeFailureClass = 'transient' | 'permanent' | 'unknown'

const transientTypes = new Set([
    'StripeConnectionError',
    'StripeAPIError',
    'StripeRateLimitError',
])

export function classifyStripeFailure(error: unknown): StripeFailureClass {
    if (!error || typeof error !== 'object') return 'unknown'
    const candidate = error as { type?: unknown; statusCode?: unknown }

    if (typeof candidate.type === 'string' && transientTypes.has(candidate.type)) {
        return 'transient'
    }

    if (typeof candidate.statusCode === 'number' && (candidate.statusCode === 408 || candidate.statusCode === 429 || candidate.statusCode >= 500)) {
        return 'transient'
    }

    if (typeof candidate.type === 'string' && ['StripeCardError', 'StripeAuthenticationError', 'StripeInvalidRequestError'].includes(candidate.type)) {
        return 'permanent'
    }

    return 'unknown'
}
