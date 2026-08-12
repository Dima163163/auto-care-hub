import { describe, expect, it } from 'vitest'

import {
    formatPaymentMoney,
    getRemainingPaymentAmountMinor,
    toStripeMinorUnits,
} from './payment-money.js'

describe('payment money formatter', () => {
    it('formats minor units with the requested currency', () => {
        expect(formatPaymentMoney(1_250, 'usd', 'en-US')).toContain('$12.50')
        expect(formatPaymentMoney(1_250, 'eur', 'de-DE')).toContain('12,50')
    })

    it('rejects invalid amounts', () => {
        expect(() => formatPaymentMoney(-1, 'usd')).toThrow()
        expect(() => formatPaymentMoney(Number.MAX_SAFE_INTEGER + 1, 'usd')).toThrow()
    })

    it('converts bounded whole payment units to Stripe minor units', () => {
        expect(toStripeMinorUnits(25)).toBe(2_500)
        expect(() => toStripeMinorUnits(0)).toThrow(/bounds/)
        expect(() => toStripeMinorUnits(1.5)).toThrow(/bounds/)
    })

    it('calculates a safe remaining balance after refunds', () => {
        expect(getRemainingPaymentAmountMinor(25, 2500)).toBe(0)
        expect(getRemainingPaymentAmountMinor(25, 500)).toBe(2000)
        expect(() => getRemainingPaymentAmountMinor(25, 2501)).toThrow(/bounds/)
    })
})
