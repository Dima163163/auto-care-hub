import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { CreateClientBookingForm } from './CreateClientBookingForm'

const mocks = vi.hoisted(() => ({
    createMyBooking: vi.fn(),
    recordClientEvent: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}))

vi.mock('@/entities/booking', () => ({
    useCreateMyBookingMutation: () => [mocks.createMyBooking, { isLoading: false }],
}))

vi.mock('@/features/experiments/api/clientExperimentApi', () => ({
    useRecordClientExperimentEventMutation: () => [mocks.recordClientEvent],
}))

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}))

vi.mock('./CreateClientBookingFormFields', () => ({
    CreateClientBookingFormFields: ({ setValue }: { setValue: (name: string, value: string, options?: { shouldValidate?: boolean }) => void }) => (
        <button
            type="button"
            onClick={() => {
                setValue('serviceId', 'service-1', { shouldValidate: true })
                setValue('date', '2026-08-02', { shouldValidate: true })
                setValue('startTime', '10:00', { shouldValidate: true })
                setValue('endTime', '11:00', { shouldValidate: true })
            }}
        >
            Choose valid booking slot
        </button>
    ),
}))

vi.mock('./CreateClientBookingFormHeader', () => ({
    CreateClientBookingFormHeader: () => <h2>Book this cabinet</h2>,
}))

vi.mock('./CreateClientBookingFormActions', () => ({
    CreateClientBookingFormActions: ({ formError, isLoading }: { formError: string | null; isLoading: boolean }) => (
        <>
            {formError && <p role="alert">{formError}</p>}
            <button type="submit" disabled={isLoading}>Create booking</button>
        </>
    ),
}))

describe('CreateClientBookingForm', () => {
    it('does not show success before the server accepts a mutation', async () => {
        const user = userEvent.setup()
        mocks.createMyBooking.mockReturnValue({
            unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }),
        })

        render(
            <I18nProvider>
                <CreateClientBookingForm
                    cabinetId="cabinet-1"
                    cabinet={{
                        title: 'Bright beauty cabinet',
                        address: 'Main Street 12',
                        city: 'Berlin',
                    }}
                    services={[{
                        id: 'service-1',
                        cabinetId: 'cabinet-1',
                        title: 'Standard beauty session',
                        durationMinutes: 60,
                        price: 2_000,
                        isActive: true,
                    }]}
                />
            </I18nProvider>,
        )

        await user.click(screen.getByRole('button', { name: 'Choose valid booking slot' }))
        await user.click(screen.getByRole('button', { name: 'Create booking' }))

        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith(
                'The connection was interrupted. Check your internet connection and try again.',
            )
        })
        expect(mocks.toastSuccess).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent(
            'The connection was interrupted. Check your internet connection and try again.',
        )
        expect(screen.queryByText('Your time is reserved')).not.toBeInTheDocument()
    })
})
