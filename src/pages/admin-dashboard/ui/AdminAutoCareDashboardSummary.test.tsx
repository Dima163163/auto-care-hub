import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AdminAutoCareDashboardHero } from './AdminAutoCareDashboardHero'
import { AdminAutoCareMetricGrid } from './AdminAutoCareMetricGrid'

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'adminAutoCareDashboard.hero.eyebrow': 'Модерация платформы',
            'adminAutoCareDashboard.hero.title': 'Поддерживайте доверие к маркетплейсу.',
            'adminAutoCareDashboard.hero.description': 'Проверяйте профили сервисов.',
            'adminAutoCareDashboard.hero.pending': 'профилей ждут проверки',
            'adminAutoCareDashboard.metrics.services': 'Профили сервисов',
            'adminAutoCareDashboard.metrics.active': 'активно',
            'adminAutoCareDashboard.metrics.review': 'Очередь проверки',
            'adminAutoCareDashboard.metrics.reviewNote': 'профилей ожидают проверки',
            'adminAutoCareDashboard.metrics.trust': 'Проверенные сервисы',
            'adminAutoCareDashboard.metrics.signals': 'сигналы доверия',
            'adminAutoCareDashboard.metrics.users': 'Пользователи платформы',
            'adminAutoCareDashboard.metrics.owners': 'владельцев сервисов',
        }[key] ?? key),
    }),
}))

describe('AdminAutoCareDashboardSummary', () => {
    it('renders the localized hero and formats the pending count', () => {
        render(<AdminAutoCareDashboardHero locale="ru" pendingCount={1234} />)

        expect(screen.getByRole('heading', { name: 'Поддерживайте доверие к маркетплейсу.' })).toBeVisible()
        expect(screen.getByText(/1[\s\u00a0]234/)).toBeVisible()
    })

    it('renders translated metric labels and locale-formatted values', () => {
        render(<AdminAutoCareMetricGrid locale="ru" providers={{ total: 1234, active: 920, verified: 87, draft: 12 }} users={{ total: 2400, owners: 321 }} />)

        expect(screen.getByText('Профили сервисов')).toBeVisible()
        expect(screen.getByText('Очередь проверки')).toBeVisible()
        expect(screen.getByText(/1[\s\u00a0]234/)).toBeVisible()
        expect(screen.getByText(/2[\s\u00a0]400/)).toBeVisible()
    })
})
