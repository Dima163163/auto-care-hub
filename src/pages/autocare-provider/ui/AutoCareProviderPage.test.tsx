import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { AutoCareProviderPage } from './AutoCareProviderPage'

const mocks = vi.hoisted(() => ({
    profile: vi.fn(),
    reviews: vi.fn(),
    trust: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    mapAutoCareProviderProfile: (value: unknown) => value,
    useGetAutoCareProviderProfileQuery: mocks.profile,
    useGetAutoCareProviderReviewsQuery: mocks.reviews,
    useGetAutoCareProviderTrustQuery: mocks.trust,
}))

function renderPage() {
    return render(
        <I18nContext.Provider value={{
            locale: 'en',
            setLocale: vi.fn(),
            t: (key: TranslationKey) => ({
                'autocare.providerNotFound': 'This service profile is unavailable.',
                'autocare.providerNoOffersDescription': 'No published services yet.',
                'autocare.providerSuspendedTitle': 'This service is temporarily unavailable.',
                'autocare.providerSuspendedDescription': 'The profile is temporarily paused.',
                'common.failedToLoad': 'Failed to load.',
                'common.tryAgainLater': 'Please try again later.',
                'common.retry': 'Retry',
                'auth.accountBlocked': 'Account blocked',
                'auth.accountBlockedDescription': 'This account is blocked.',
                'auth.sessionExpiredTitle': 'Your session has expired',
                'auth.sessionExpiredDescription': 'Sign in again to continue safely.',
                'auth.signIn': 'Sign in',
            }[key] ?? key),
        }}>
            <MemoryRouter initialEntries={['/services/proservice']}>
                <Routes>
                    <Route path="/services/:id" element={<AutoCareProviderPage />} />
                </Routes>
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

function baseQuery() {
    return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: undefined,
        refetch: vi.fn(),
    }
}

describe('AutoCareProviderPage unavailable states', () => {
    beforeEach(() => {
        mocks.profile.mockReset().mockReturnValue(baseQuery())
        mocks.reviews.mockReset().mockReturnValue({ ...baseQuery(), data: { reviews: [] } })
        mocks.trust.mockReset().mockReturnValue({ ...baseQuery(), data: undefined })
    })

    it('renders an empty state when the provider profile is not found', () => {
        renderPage()

        expect(screen.getByRole('status')).toHaveAttribute('data-state', 'empty')
        expect(screen.getByText('This service profile is unavailable.')).toBeVisible()
    })

    it('renders a service-specific suspended state for a 423 profile response', () => {
        const refetch = vi.fn()
        mocks.profile.mockReturnValue({ ...baseQuery(), isError: true, error: { status: 423, data: { code: 'ACCOUNT_SUSPENDED' } }, refetch })
        renderPage()

        expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'suspended')
        expect(screen.getByText('This service is temporarily unavailable.')).toBeVisible()
    })

    it('keeps a retry action for a transient profile error', async () => {
        const refetch = vi.fn()
        mocks.profile.mockReturnValue({ ...baseQuery(), isError: true, error: { status: 503, data: { message: 'temporary failure' } }, refetch })
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Retry' }))

        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('shows the session-expired state without losing the route shell', () => {
        mocks.profile.mockReturnValue({ ...baseQuery(), isError: true, error: { status: 401, data: { code: 'SESSION_EXPIRED' } } })
        renderPage()

        expect(screen.getByRole('alert')).toHaveAttribute('data-state', 'session-expired')
        expect(screen.getByText('Your session has expired')).toBeVisible()
    })
})
