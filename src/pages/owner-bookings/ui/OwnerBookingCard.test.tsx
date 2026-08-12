import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { OwnerBookingCard } from './OwnerBookingCard'

vi.mock('@/entities/booking', () => ({
    BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
    useGetBookingStatusHistoryQuery: () => ({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    }),
    useGetOwnerPendingRescheduleRequestsQuery: () => ({ data: [] }),
}))

vi.mock('@/features/booking/update-booking-status', () => ({
    BookingStatusSelect: () => null,
}))

vi.mock('./OwnerBookingNote', () => ({
    OwnerBookingNote: () => null,
}))

vi.mock('@/features/booking/resolve-reschedule/ui/ResolveBookingRescheduleActions', () => ({
    ResolveBookingRescheduleActions: () => null,
}))

describe('OwnerBookingCard payment ledger', () => {
    it('renders the owner-safe gross, commission, payout, refund, and balance values', () => {
        render(
            <MemoryRouter>
                <I18nProvider>
                    <OwnerBookingCard
                        booking={{
                            id: 'booking-1',
                            clientId: 'client-1',
                            cabinetId: 'cabinet-1',
                            serviceId: 'service-1',
                            date: '2026-08-01',
                            startTime: '10:00',
                            endTime: '11:00',
                            status: 'confirmed',
                            comment: null,
                            cancellationReason: null,
                            createdAt: '2026-08-01T08:00:00.000Z',
                            cabinet: { id: 'cabinet-1', title: 'Studio', address: 'Main 1', city: 'Samara' },
                            service: { id: 'service-1', title: 'Portrait', durationMinutes: 60, price: 1500 },
                            client: { id: 'client-1', name: 'Alex', email: 'alex@example.com', phone: null },
                            ownerNote: null,
                            paymentLedger: {
                                grossAmount: 1500,
                                commissionAmount: 30,
                                ownerPayoutAmount: 1470,
                                refundedAmountMinor: 2500,
                                remainingAmountMinor: 147500,
                                currency: 'rub',
                                status: 'partially_refunded',
                                createdAt: '2026-08-01T08:01:00.000Z',
                            },
                        }}
                    />
                </I18nProvider>
            </MemoryRouter>,
        )

        expect(screen.getByRole('region', { name: 'Payment ledger' })).toBeVisible()
        expect(screen.getByText('Gross amount')).toBeVisible()
        expect(screen.getByText('Commission')).toBeVisible()
        expect(screen.getByText('Owner payout')).toBeVisible()
        expect(screen.getByText('Refunded')).toBeVisible()
        expect(screen.getByText('Remaining')).toBeVisible()
        expect(screen.getAllByText(/RUB/).length).toBeGreaterThanOrEqual(5)
        expect(screen.getByText('Payment partially refunded')).toBeVisible()
    })
})
