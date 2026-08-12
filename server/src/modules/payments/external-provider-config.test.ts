import { describe, expect, it } from 'vitest'

import { resolveExternalPaymentProviderConfig } from './external-provider-config.js'

describe('external payment provider config', () => {
    it('resolves test and live Stripe modes', () => {
        expect(resolveExternalPaymentProviderConfig({ secretKey: 'sk_test_demo', nodeEnv: 'test', requestTimeoutMs: 1_000, maxNetworkRetries: 1 }).mode).toBe('test')
        expect(resolveExternalPaymentProviderConfig({ secretKey: 'sk_live_demo', nodeEnv: 'production', requestTimeoutMs: 1_000, maxNetworkRetries: 1 }).mode).toBe('live')
    })

    it('rejects live mode mismatches and invalid keys', () => {
        expect(() => resolveExternalPaymentProviderConfig({ secretKey: 'sk_test_demo', nodeEnv: 'production', requestTimeoutMs: 1_000, maxNetworkRetries: 1 })).toThrow()
        expect(() => resolveExternalPaymentProviderConfig({ secretKey: 'secret', nodeEnv: 'test', requestTimeoutMs: 1_000, maxNetworkRetries: 1 })).toThrow()
    })
})
