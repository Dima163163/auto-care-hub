import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { OwnerProviderInvitationAcceptPage } from './OwnerProviderInvitationAcceptPage'

const mocks = vi.hoisted(() => ({
    accept: vi.fn(),
    error: null as unknown,
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: 'staff-1', name: 'Alex Staff', email: 'staff@example.com' } }),
}))

vi.mock('@/entities/automotive-service', () => ({
    useAcceptAutoCareProviderInvitationMutation: () => [mocks.accept, { isLoading: false, error: mocks.error }],
}))

function renderPage(initialEntry = '/owner/invitations/accept?token=invite-token', locale: 'en' | 'ru' = 'en') {
    return render(
        <I18nContext.Provider value={{
            locale,
            setLocale: vi.fn(),
            t: (key: TranslationKey) => key,
        }}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <OwnerProviderInvitationAcceptPage />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('OwnerProviderInvitationAcceptPage', () => {
    beforeEach(() => {
        mocks.error = null
        mocks.accept.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockResolvedValue({
                membership: {
                    id: 'membership-1',
                    providerId: 'provider-1',
                    userId: 'staff-1',
                    user: { id: 'staff-1', name: 'Alex Staff', email: 'staff@example.com', avatarUrl: null },
                    locationId: 'location-1',
                    role: 'staff',
                    status: 'active',
                    createdAt: '2026-08-29T10:00:00.000Z',
                },
                invitation: {},
            }),
        }))
    })

    it('accepts the token and offers a scoped workspace link', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

        expect(mocks.accept).toHaveBeenCalledWith({ token: 'invite-token' })
        expect(await screen.findByRole('heading', { name: 'Invitation accepted' })).toBeVisible()
        expect(screen.getByRole('link', { name: /Open workspace/ })).toHaveAttribute('href', '/owner/autocare-providers/provider-1')
        expect(screen.getByText('Assigned branch')).toBeVisible()
    })

    it('requires a token when the link was opened without one', async () => {
        const user = userEvent.setup()
        renderPage('/owner/invitations/accept')

        await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

        expect(mocks.accept).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent('Enter an invitation token to continue.')
    })

    it('explains expired invitations without exposing transport details', () => {
        mocks.error = { status: 409, data: { message: 'Provider invitation has expired.' } }
        renderPage()

        expect(screen.getByRole('alert')).toHaveTextContent('This invitation has expired.')
        expect(screen.getByRole('textbox')).toHaveValue('invite-token')
    })
})
