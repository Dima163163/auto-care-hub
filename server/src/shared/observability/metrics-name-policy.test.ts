import { describe, expect, it } from 'vitest'

import { normalizeMetricName } from './metrics-name-policy.js'

describe('metric name policy', () => {
    it('normalizes valid names', () => {
        expect(normalizeMetricName(' api_requests_total ')).toBe('api_requests_total')
    })

    it('rejects unsafe names', () => {
        expect(() => normalizeMetricName('1metric')).toThrow(/invalid/)
        expect(() => normalizeMetricName('metric-name')).toThrow(/invalid/)
        expect(() => normalizeMetricName('x'.repeat(101))).toThrow(/invalid/)
    })
})
