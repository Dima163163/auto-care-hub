import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import type { SuperAdminPlatformOverview } from '@/entities/automotive-service'

import { SuperAdminDashboardPage } from './SuperAdminDashboardPage'

const overview = {
    markets: [{ id: 'market-1', countryCode: 'RU', countryName: 'Russia', cityCode: 'MOW', cityName: 'Moscow', currencyCode: 'RUB', launchReady: true, supportedLocales: ['ru', 'en'] }],
    providers: { total: 1234, active: 920, draft: 10, suspended: 2, verified: 87 },
    users: { clients: 2400, owners: 321, admins: 4, superAdmins: 1 },
} as SuperAdminPlatformOverview

vi.mock('@/entities/automotive-service', () => ({
    useGetSuperAdminPlatformOverviewQuery: () => ({ data: overview, isLoading: false, error: null, refetch: vi.fn() }),
}))

vi.mock('@/pages/admin-dashboard/ui/AdminAutoCareAppealsPanel', () => ({ AdminAutoCareAppealsPanel: () => null }))
vi.mock('@/pages/admin-dashboard/ui/AdminChatReportsPanel', () => ({ AdminChatReportsPanel: () => null }))
vi.mock('@/pages/admin-dashboard/ui/AdminDataQualityPanel', () => ({ AdminDataQualityPanel: () => null }))
vi.mock('./SuperAdminMarketsPanel', () => ({ SuperAdminMarketsPanel: () => null }))
vi.mock('./SuperAdminTrustPolicyPanel', () => ({ SuperAdminTrustPolicyPanel: () => null }))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'superAdminDashboard.eyebrow': 'Центр управления super-admin',
            'superAdminDashboard.title': 'Управляйте рынками, доступами и правилами качества.',
            'superAdminDashboard.description': 'Только super-admin меняет роли платформы и правила качества.',
            'superAdminDashboard.markets': 'Рынки и языки',
            'superAdminDashboard.team': 'Доступы и роли',
            'superAdminDashboard.trust': 'Программа доверия',
            'superAdminDashboard.locked': 'Пока не включено',
            'superAdminDashboard.users': 'Управлять пользователями',
            'superAdminDashboard.audit': 'Открыть журнал аудита',
            'superAdminDashboard.providers': 'сервисов',
            'superAdminDashboard.active': 'активно',
            'superAdminDashboard.clients': 'Клиенты',
            'superAdminDashboard.owners': 'Владельцы сервисов',
            'superAdminDashboard.admins': 'Администраторы',
            'superAdminDashboard.superAdmin': 'Суперадмин',
            'common.notProvided': 'Не указано',
            'common.loading': 'Загрузка',
            'common.failedToLoad': 'Не удалось загрузить.',
            'common.retry': 'Повторить',
        }[key] ?? key),
    }),
}))

describe('SuperAdminDashboardPage', () => {
    it('renders localized summary copy and locale-formatted platform counts', () => {
        render(<MemoryRouter><SuperAdminDashboardPage /></MemoryRouter>)

        expect(screen.getByRole('heading', { name: 'Управляйте рынками, доступами и правилами качества.' })).toBeVisible()
        expect(screen.getByText((_, element) => element?.textContent === 'Moscow, Russia')).toBeVisible()
        expect(screen.getByText(/1[\s\u00a0]234/)).toBeVisible()
        expect(screen.getByText(/2[\s\u00a0]400/)).toBeVisible()
        expect(screen.getByRole('link', { name: 'Управлять пользователями' })).toBeVisible()
    })
})
