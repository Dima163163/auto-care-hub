export type ExternalPaymentProviderConfig = {
    provider: 'stripe'
    mode: 'test' | 'live'
    requestTimeoutMs: number
    maxNetworkRetries: number
}

export function resolveExternalPaymentProviderConfig(input: {
    secretKey: string
    nodeEnv: string
    requestTimeoutMs: number
    maxNetworkRetries: number
}): ExternalPaymentProviderConfig {
    const isTestKey = input.secretKey.startsWith('sk_test_')
    const isLiveKey = input.secretKey.startsWith('sk_live_')

    if (!isTestKey && !isLiveKey) throw new Error('Stripe secret key mode is invalid.')
    if (input.nodeEnv === 'production' && !isLiveKey) throw new Error('Production requires a live Stripe secret key.')
    if (!Number.isInteger(input.requestTimeoutMs) || input.requestTimeoutMs < 1) throw new Error('Stripe timeout is invalid.')
    if (!Number.isInteger(input.maxNetworkRetries) || input.maxNetworkRetries < 0) throw new Error('Stripe retry count is invalid.')

    return {
        provider: 'stripe',
        mode: isLiveKey ? 'live' : 'test',
        requestTimeoutMs: input.requestTimeoutMs,
        maxNetworkRetries: input.maxNetworkRetries,
    }
}
