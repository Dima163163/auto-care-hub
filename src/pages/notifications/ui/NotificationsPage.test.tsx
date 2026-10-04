import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Notification } from '@/entities/notification'
import { NotificationsPage } from './NotificationsPage'
const state = vi.hoisted(() => ({ items: [] as Notification[], unreadCount: 99 }))
vi.mock('@/shared/lib/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }))
vi.mock('@/features/auth', () => ({ useGetMeQuery: () => ({ data: undefined }) }))
vi.mock('@/widgets/profile-navigation/ui/ProfileNavigation', () => ({ ProfileNavigation: () => null }))
vi.mock('@/pages/profile/ui/ProfilePreferences', () => ({ ProfilePreferences: () => null }))
vi.mock('@/entities/notification', () => ({
    useGetNotificationsQuery: () => ({ data: { items: state.items, nextCursor: null }, error: null, isFetching: false, isLoading: false, refetch: vi.fn() }),
    useGetUnreadNotificationsCountQuery: () => ({ data: { count: state.unreadCount } }),
    useLazyGetNotificationsQuery: () => [vi.fn(), { isFetching: false }],
    useMarkAllNotificationsReadMutation: () => [vi.fn(), { isLoading: false }],
    useMarkNotificationReadMutation: () => [vi.fn(), { isLoading: false }],
    notificationsApi: { util: { updateQueryData: vi.fn() } },
}))
function entry(id: string, readAt: string | null): Notification { return { id, category: 'account', title: id, message: 'Notification body', link: null, metadata: {}, readAt, createdAt: '2026-10-01T10:00:00Z' } }
function mount() { return render(<MemoryRouter><NotificationsPage /></MemoryRouter>) }
describe('loaded notification filters', () => {
    beforeEach(() => { state.items = [entry('Unread item', null), entry('Read item', '2026-10-01T11:00:00Z')] })
    it('filters only the loaded list and restores all items without marking them read', async () => {
        mount(); await userEvent.click(screen.getByRole('button', { name: 'notifications.unread' }))
        expect(screen.getByRole('heading', { name: 'Unread item' })).toBeVisible()
        expect(screen.queryByRole('heading', { name: 'Read item' })).not.toBeInTheDocument()
        expect(state.items[0]?.readAt).toBeNull()
        await userEvent.click(screen.getByRole('button', { name: 'autocare.allNotifications' }))
        expect(screen.getByRole('heading', { name: 'Read item' })).toBeVisible()
    })
    it('describes an empty loaded unread selection without replacing the global unread count', async () => {
        state.items = [entry('Read item', '2026-10-01T11:00:00Z')]; mount()
        await userEvent.click(screen.getByRole('button', { name: 'notifications.unread' }))
        expect(screen.getByText('autocare.noUnreadNotifications')).toBeVisible()
        expect(screen.getByRole('button', { name: 'notifications.markAllRead' })).toBeEnabled()
    })
})
