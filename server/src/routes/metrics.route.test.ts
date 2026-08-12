import { describe, expect, it } from 'vitest'

import { getMetricsResponseHeaders, isMetricsAuthorizationValid } from './metrics.route.js'

describe('metrics endpoint cache policy', () => {
    it('returns private no-store headers', () => {
        expect(getMetricsResponseHeaders()).toEqual({
            'cache-control': 'no-store',
            pragma: 'no-cache',
        })
    })
})

describe('metrics endpoint authorization', () => {
    it('rejects missing configuration and missing authorization', () => {
        expect(isMetricsAuthorizationValid(undefined, null)).toBe(false)
        expect(isMetricsAuthorizationValid(undefined, 'metrics-secret')).toBe(false)
    })

    it('rejects malformed and incorrect bearer tokens', () => {
        expect(isMetricsAuthorizationValid('Basic metrics-secret', 'metrics-secret')).toBe(false)
        expect(isMetricsAuthorizationValid('Bearer wrong-secret', 'metrics-secret')).toBe(false)
        expect(isMetricsAuthorizationValid('Bearer metrics-secret-extra', 'metrics-secret')).toBe(false)
    })

    it('accepts only the exact configured bearer token', () => {
        expect(isMetricsAuthorizationValid('Bearer metrics-secret', 'metrics-secret')).toBe(true)
    })
})
