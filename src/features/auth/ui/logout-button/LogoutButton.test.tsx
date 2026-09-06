import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LogoutButton } from './LogoutButton'

const mocks = vi.hoisted(() => ({
    alert: vi.fn(),
    dispatch: vi.fn(),
    navigate: vi.fn(),
    logout: vi.fn(),
}))

vi.mock('react-router', () => ({
    useNavigate: () => mocks.navigate,
}))

vi.mock('react-redux', () => ({
    useDispatch: () => mocks.dispatch,
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            'auth.logOut': 'Log out',
            'auth.failedToLogout': 'Failed to log out',
            'auth.loggingOut': 'Logging out',
        }[key] ?? key),
    }),
}))

vi.mock('../../api/authApi', () => ({
    useLogoutMutation: () => [mocks.logout, { isLoading: false }],
}))

describe('LogoutButton', () => {
    beforeEach(() => {
        mocks.alert.mockReset()
        mocks.dispatch.mockReset()
        mocks.navigate.mockReset()
        mocks.logout.mockReset()
        vi.stubGlobal('alert', mocks.alert)
    })

    it.each([
        ['offline', { status: 'FETCH_ERROR' }],
        ['HTTP 500', { status: 500 }],
    ])('returns to the public shell and reports a %s logout failure', async (_label, error) => {
        const unwrap = vi.fn().mockRejectedValue(error)
        mocks.logout.mockReturnValue({ unwrap })
        const user = userEvent.setup()

        render(<LogoutButton />)
        await user.click(screen.getByRole('button', { name: 'Log out' }))

        expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
        expect(unwrap).toHaveBeenCalledOnce()
        expect(mocks.alert).toHaveBeenCalledWith('Failed to log out')
    })
})
