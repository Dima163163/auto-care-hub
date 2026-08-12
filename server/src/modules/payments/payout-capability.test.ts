import { describe, expect, it } from 'vitest'

import { getPayoutCapabilityDecision } from './payout-capability.js'

describe('payout capability', () => {
    it('enables payouts only when all Stripe capabilities are ready', () => {
        expect(getPayoutCapabilityDecision({ chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true })).toBe('enabled')
        expect(getPayoutCapabilityDecision({ chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true })).toBe('pending')
        expect(getPayoutCapabilityDecision({ chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false })).toBe('disabled')
    })
})
