import { describe, expect, it } from 'vitest'

import { getPaymentReturnState } from './get-payment-return-state'

describe('getPaymentReturnState', () => {
    it('confirms success only for a paid server response', () => {
        expect(getPaymentReturnState({
            payment: 'success',
            bookingId: 'booking-1',
            status: 'paid',
            isLoading: false,
            isError: false,
        })).toBe('success')
    })

    it('does not trust success without a booking or server response', () => {
        expect(getPaymentReturnState({
            payment: 'success',
            bookingId: null,
            status: 'paid',
            isLoading: false,
            isError: false,
        })).toBeNull()
        expect(getPaymentReturnState({
            payment: 'success',
            bookingId: 'booking-1',
            status: 'paid',
            isLoading: false,
            isError: true,
        })).toBeNull()
    })

    it('keeps an unresolved paid transition as pending', () => {
        expect(getPaymentReturnState({
            payment: 'success',
            bookingId: 'booking-1',
            status: 'pending',
            isLoading: false,
            isError: false,
        })).toBe('pending')
    })

    it('surfaces a server-confirmed failed payment instead of dropping the return state', () => {
        expect(getPaymentReturnState({
            payment: 'success',
            bookingId: 'booking-1',
            status: 'failed',
            isLoading: false,
            isError: false,
        })).toBe('failed')
    })

    it('preserves the cancelled return state without claiming payment success', () => {
        expect(getPaymentReturnState({
            payment: 'cancelled',
            bookingId: 'booking-1',
            status: null,
            isLoading: false,
            isError: false,
        })).toBe('cancelled')
    })
})
