import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import type { User } from '@/entities/user'
import { I18nContext } from '@/shared/lib/i18n-context'

import { CurrentUserBadge } from './CurrentUserBadge'

vi.mock('../logout-button/LogoutButton', () => ({
    LogoutButton: () => <button type="button">Logout</button>,
}))

const superAdmin: User = {
    id: 'super-admin-1',
    name: 'Super Admin',
    email: 'super-admin@example.com',
    phone: null,
    role: 'super_admin',
    status: 'active',
    avatarUrl: null,
    provider: 'email',
    locale: null,
    emailVerifiedAt: '2026-07-16T00:00:00.000Z',
    emailNotifications: true,
    bookingEmailNotifications: true,
    preferredCity: null,
    preferredCategories: [],
    createdAt: '2026-07-16T00:00:00.000Z',
}

const translations: Record<string, string> = {
    'auth.loadingUser': 'Loading user...',
    'auth.guestMode': 'Guest mode',
    'navigation.adminDashboard': 'Admin dashboard',
    'user.owner': 'Owner',
    'user.superAdmin': 'Super administrator',
}

function renderBadge(user: User) {
    return render(
        <MemoryRouter>
            <I18nContext.Provider
                value={{
                    locale: 'en',
                    setLocale: vi.fn(),
                    t: (key) => translations[key] ?? key,
                }}
            >
                <CurrentUserBadge user={user} />
            </I18nContext.Provider>
        </MemoryRouter>,
    )
}

describe('CurrentUserBadge', () => {
    it('links a super-admin role badge to the admin workspace', () => {
        renderBadge(superAdmin)

        expect(screen.getByRole('link', { name: 'Super administrator' }))
            .toHaveAttribute('href', '/admin/dashboard')
    })

    it('keeps non-super-admin role badges non-navigational', () => {
        renderBadge({ ...superAdmin, role: 'owner' })

        expect(screen.queryByRole('link', { name: 'Owner' })).not.toBeInTheDocument()
        expect(screen.getByText('Owner')).toBeVisible()
    })
})
