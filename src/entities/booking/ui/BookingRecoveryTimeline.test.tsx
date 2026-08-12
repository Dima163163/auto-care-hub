import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '@/shared/lib/i18n-context'

import { BookingRecoveryTimeline } from './BookingRecoveryTimeline'

const translations: Record<string, string> = {
    'booking.receiptTitle': 'Payment receipt',
    'booking.invoiceNumber': 'Invoice',
    'booking.receiptIssuedAt': 'Issued',
    'booking.receiptOriginalAmount': 'Original amount',
    'booking.receiptRefundedAmount': 'Refunded',
    'booking.receiptRemainingAmount': 'Remaining balance',
    'booking.receiptStatusPaid': 'Paid',
    'booking.paymentStatusPaid': 'Payment received',
    'booking.recoveryTimeline': 'Booking and payment timeline',
    'booking.recoveryTimelineEmpty': 'No events',
    'booking.paymentAttemptPaid': 'Payment attempt {{attempt}} succeeded',
}

describe('BookingRecoveryTimeline receipt', () => {
    it('shows a client-safe invoice summary and refund balance', () => {
        render(
            <I18nContext.Provider
                value={{
                    locale: 'en',
                    setLocale: vi.fn(),
                    t: (key, params) => {
                        const value = translations[key] ?? key
                        return params?.attempt ? value.replace('{{attempt}}', String(params.attempt)) : value
                    },
                }}
            >
                <BookingRecoveryTimeline
                    statusHistory={[]}
                    paymentStatus={{
                        status: 'partially_refunded',
                        grossAmount: 1_500,
                        refundedAmountMinor: 250,
                        remainingAmountMinor: 125_000,
                        currency: 'rub',
                        createdAt: '2026-08-11T10:00:00.000Z',
                        invoice: {
                            invoiceId: 'inv_public_1',
                            amount: 1_500,
                            currency: 'rub',
                            status: 'paid',
                            issuedAt: '2026-08-11T10:01:00.000Z',
                        },
                        attempts: [],
                    }}
                />
            </I18nContext.Provider>,
        )

        expect(screen.getByRole('region', { name: 'Payment receipt' })).toBeVisible()
        expect(screen.getByText(/inv_public_1/)).toBeVisible()
        expect(screen.getByText('Original amount')).toBeVisible()
        expect(screen.getByText('Refunded')).toBeVisible()
        expect(screen.getByText('Remaining balance')).toBeVisible()
        expect(screen.getByText('Paid')).toBeVisible()
    })
})
