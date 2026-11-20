import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'
import { clearSessionExpired, markSessionExpired } from '@/shared/lib/auth-session-state'
import { RequireAuth } from './RequireAuth'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('../../api/authApi', () => ({ useGetMeQuery: auth }))
vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareWorkspaceAccessQuery: () => ({}),
}))

function SignInDestination() {
    return <p data-search={useLocation().search}>Sign-in destination</p>
}

function renderGuard() {
    return render(<I18nProvider>
        <MemoryRouter initialEntries={['/private']}>
            <Routes>
                <Route path="/private" element={<RequireAuth>Private data</RequireAuth>} />
                <Route path="/login" element={<SignInDestination />} />
            </Routes>
        </MemoryRouter>
    </I18nProvider>)
}

afterEach(() => {
    auth.mockReset()
    clearSessionExpired()
})

describe('protected route session recovery', () => {
    it('offers a retry without redirecting or disclosing private content when refresh is unavailable', () => {
        const refetch = vi.fn()
        auth.mockReturnValue({ isError: true, error: { status: 503 }, refetch })
        renderGuard()
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.queryByText('Private data')).not.toBeInTheDocument()
        expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button'))
        expect(refetch).toHaveBeenCalledOnce()
    })

    it('redirects to sign-in on an unauthorized response', () => {
        auth.mockReturnValue({ isError: true, error: { status: 401 } })
        renderGuard()
        expect(screen.getByText('Sign-in destination')).toBeInTheDocument()
    })

    it('redirects when the session expires while auth data is being reloaded', () => {
        auth.mockReturnValue({ isLoading: true })
        renderGuard()
        expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument()

        act(() => markSessionExpired())

        expect(screen.getByText('Sign-in destination')).toHaveAttribute('data-search', '?reason=session-expired')
        expect(screen.queryByText('Private data')).not.toBeInTheDocument()
    })
})
