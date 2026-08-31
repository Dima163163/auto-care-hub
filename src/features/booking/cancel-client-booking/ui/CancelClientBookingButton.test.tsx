import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Booking } from '@/entities/booking'

import { CancelClientBookingButton } from './CancelClientBookingButton'

const cancelBooking = vi.hoisted(() => vi.fn())

vi.mock('@/entities/booking', () => ({
    useCancelMyBookingMutation: () => [cancelBooking, { isLoading: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('CancelClientBookingButton', () => {
    beforeEach(() => {
        cancelBooking.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Запись уже отменена.' } }),
        }))
    })

    it('keeps the cancellation reason and exposes an accessible retryable error', async () => {
        const user = userEvent.setup()
        const booking = {
            id: 'booking-1',
            clientId: 'client-1',
            cabinetId: 'cabinet-1',
            serviceId: 'service-1',
            date: '2026-08-30',
            startTime: '10:00',
            endTime: '11:00',
            status: 'confirmed',
            createdAt: '2026-08-29T10:00:00.000Z',
        } satisfies Booking
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<CancelClientBookingButton booking={booking} />)
            await user.click(screen.getByRole('button', { name: 'booking.cancelBooking' }))

            const reason = screen.getByRole('textbox', { name: 'booking.cancellationReason' })
            await user.type(reason, 'Нашёл другую дату')
            await user.click(screen.getByRole('button', { name: 'booking.confirmCancellationAction' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Запись уже отменена.')
            expect(reason).toHaveValue('Нашёл другую дату')
            expect(cancelBooking).toHaveBeenCalledWith({ id: 'booking-1', reason: 'Нашёл другую дату' })
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
