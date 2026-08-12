import { describe, expect, it } from 'vitest'

import { normalizeMetricLabels } from './metrics-label-policy.js'

describe('metric label policy', () => {
    it('normalizes bounded labels', () => {
        expect(normalizeMetricLabels({ outcome: ' success ' })).toEqual({ outcome: 'success' })
    })

    it('rejects too many or empty labels', () => {
        expect(() => normalizeMetricLabels(Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`l${index}`, 'x']))))
            .toThrow(/count/)
        expect(() => normalizeMetricLabels({ outcome: ' ' })).toThrow(/invalid/)
    })
})
