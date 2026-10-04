import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '@/entities/user'
import { AdminUsersListItem } from './AdminUsersListItem'
vi.mock('@/shared/lib/useTranslation', () => ({ useTranslation: () => ({ locale: 'en', t: (key: string) => key }) }))
vi.mock('@/entities/user', async (original) => ({ ...await original<typeof import('@/entities/user')>(), useUpdateAdminUserRoleMutation: () => [vi.fn(), { isLoading: false }] }))
const user: User = { id: 'client-1', name: 'Test client', email: 'test@example.test', phone: null, role: 'client', status: 'active', avatarUrl: null, locale: 'en', provider: 'email', emailVerifiedAt: null, emailNotifications: false, bookingEmailNotifications: false, preferredCity: null, preferredCategories: [], createdAt: '2026-10-01T10:00:00Z' }
describe('explicit user status actions', () => {
    it('requests the intended block status and leaves confirmation to the parent', async () => {
        const onStatusChange = vi.fn()
        render(<AdminUsersListItem user={user} viewerRole="admin" viewerId="admin-1" isUpdating={false} onStatusChange={onStatusChange} />)
        await userEvent.click(screen.getByRole('button', { name: 'autocare.blockUserAction' }))
        expect(onStatusChange).toHaveBeenCalledWith('client-1', 'blocked')
    })
    it('does not allow a viewer to block themselves', () => {
        render(<AdminUsersListItem user={{ ...user, role: 'super_admin' }} viewerRole="super_admin" viewerId="client-1" isUpdating={false} onStatusChange={vi.fn()} />)
        expect(screen.getByRole('button', { name: 'autocare.blockUserAction' })).toBeDisabled()
    })
    it('preserves the administrator restriction for other privileged users', () => {
        render(<AdminUsersListItem user={{ ...user, role: 'admin' }} viewerRole="admin" viewerId="admin-2" isUpdating={false} onStatusChange={vi.fn()} />)
        expect(screen.getByRole('button', { name: 'autocare.blockUserAction' })).toBeDisabled()
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })
})
