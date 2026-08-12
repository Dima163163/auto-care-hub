import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '@/shared/lib/i18n-context'

import { CreateClientBookingFormActions } from './CreateClientBookingFormActions'

const translations = {
    'booking.createBooking': 'Create booking',
    'booking.creatingBooking': 'Creating booking...',
}

function renderActions(formError: string | null, isLoading: boolean) {
    return render(
        <I18nContext.Provider
            value={{
                locale: 'en',
                setLocale: vi.fn(),
                t: (key) => translations[key as keyof typeof translations] ?? key,
            }}
        >
            <form>
                <CreateClientBookingFormActions
                    formError={formError}
                    isLoading={isLoading}
                />
            </form>
        </I18nContext.Provider>,
    )
}

describe('CreateClientBookingFormActions', () => {
    it('shows an API error while keeping the submit action available', () => {
        renderActions('The selected time is no longer available.', false)

        expect(
            screen.getByText('The selected time is no longer available.'),
        ).toBeVisible()
        expect(
            screen.getByRole('button', { name: 'Create booking' }),
        ).toBeEnabled()
    })

    it('disables repeated booking submission while the request is pending', () => {
        renderActions(null, true)

        expect(
            screen.getByRole('button', { name: 'Creating booking...' }),
        ).toBeDisabled()
    })
})
