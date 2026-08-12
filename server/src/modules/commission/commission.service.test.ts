import { describe, expect, it } from 'vitest'

import {
    calculateBookingCommission,
    calculateOwnerPayout,
} from './commission.service.js'

describe('booking commission', () => {
    it('charges two percent from a successful booking', () => {
        expect(calculateBookingCommission(1500)).toBe(30)
        expect(calculateOwnerPayout(1500)).toBe(1470)
    })

    it('applies the commission cap', () => {
        expect(calculateBookingCommission(1_000_000)).toBe(10_000)
    })

    it('does not charge invalid or non-positive amounts', () => {
        expect(calculateBookingCommission(0)).toBe(0)
        expect(calculateBookingCommission(-100)).toBe(0)
        expect(calculateBookingCommission(Number.NaN)).toBe(0)
    })
})
