import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'
import { RequireAuth } from './RequireAuth'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('../../api/authApi', () => ({ useGetMeQuery: auth }))
vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareWorkspaceAccessQuery: () => ({}),
}))

function renderGuard() {
    return render(<I18nProvider>
        <MemoryRouter initialEntries={['/private']}>
            <Routes>
                <Route path="/private" element={<RequireAuth>Private data</RequireAuth>} />
                <Route path="/login" element={<p>Sign-in destination</p>} />
            </Routes>
        </MemoryRouter>
    </I18nProvider>)
}

afterEach(() => auth.mockReset())

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
})
