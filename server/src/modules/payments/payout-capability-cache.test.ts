import { describe, expect, it } from 'vitest'

import { isPayoutCapabilityFresh } from './payout-capability-cache.js'

describe('payout capability freshness', () => {
    it('accepts recent checks and rejects stale or future checks', () => {
        expect(isPayoutCapabilityFresh(90_000, 100_000, 10_000)).toBe(true)
        expect(isPayoutCapabilityFresh(89_999, 100_000, 10_000)).toBe(false)
        expect(isPayoutCapabilityFresh(100_001, 100_000, 10_000)).toBe(false)
        expect(isPayoutCapabilityFresh(null, 100_000, 10_000)).toBe(false)
    })
})
