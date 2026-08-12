import { describe, expect, it } from 'vitest'

import { boundMaintenanceSummaryCount } from './maintenance-summary-policy.js'

describe('maintenance summary policy', () => {
    it('caps large but valid counters', () => {
        expect(boundMaintenanceSummaryCount(1_000_001)).toBe(1_000_000)
        expect(boundMaintenanceSummaryCount(10)).toBe(10)
    })

    it('rejects invalid counters', () => {
        expect(() => boundMaintenanceSummaryCount(-1)).toThrow(/invalid/)
        expect(() => boundMaintenanceSummaryCount(1.5)).toThrow(/invalid/)
    })
})
