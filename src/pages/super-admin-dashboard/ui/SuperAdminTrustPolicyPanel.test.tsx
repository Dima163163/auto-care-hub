import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SuperAdminTrustPolicy } from '@/entities/automotive-service'

import { SuperAdminTrustPolicyPanel } from './SuperAdminTrustPolicyPanel'

const mocks = vi.hoisted(() => ({ update: vi.fn() }))

const policy = {
    policyVersion: 'v1',
    trustedMinimumRating: 4.5,
    trustedMinimumReviews: 10,
    trustedMinimumCompletedVisits: 20,
    trustedMaxNoShowRate: 0.1,
    trustedMaxComplaintRate: 0.2,
    trustedMaxResponseTimeMinutes: 60,
    reassessmentIntervalHours: 24,
    rollout: { enabled: true, marketIds: ['market-1'], percentage: 25 },
    updatedAt: null,
} as SuperAdminTrustPolicy

vi.mock('@/entities/automotive-service', () => ({
    useGetSuperAdminTrustPolicyQuery: () => ({ data: policy, isLoading: false, error: null, refetch: vi.fn() }),
    useGetAutoCareMarketsQuery: () => ({ data: [{ id: 'market-1', cityName: 'Moscow', countryCode: 'RU' }], isLoading: false, error: null }),
    useUpdateSuperAdminTrustPolicyMutation: () => [mocks.update, { isLoading: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'superAdminTrustPolicy.title': 'Доверие и rollout',
            'superAdminTrustPolicy.description': 'Настраивайте правила доверия.',
            'superAdminTrustPolicy.policyVersion': 'Версия политики',
            'superAdminTrustPolicy.rating': 'Минимальный рейтинг',
            'superAdminTrustPolicy.reviews': 'Минимум отзывов',
            'superAdminTrustPolicy.visits': 'Завершённых визитов',
            'superAdminTrustPolicy.noShow': 'Максимум no-show, %',
            'superAdminTrustPolicy.complaints': 'Максимум жалоб, %',
            'superAdminTrustPolicy.response': 'Максимальный ответ, мин',
            'superAdminTrustPolicy.interval': 'Пересмотр score, часов',
            'superAdminTrustPolicy.rollout': 'Включить trust rollout',
            'superAdminTrustPolicy.percentage': 'Процент rollout',
            'superAdminTrustPolicy.markets': 'Рынки rollout',
            'superAdminTrustPolicy.allMarkets': 'Все рынки',
            'superAdminTrustPolicy.save': 'Сохранить правила',
            'superAdminTrustPolicy.saving': 'Сохранение…',
            'superAdminTrustPolicy.saved': 'Правила сохранены',
            'superAdminTrustPolicy.retry': 'Повторить',
            'superAdminTrustPolicy.loading': 'Загрузка правил…',
            'superAdminTrustPolicy.failed': 'Не удалось загрузить правила доверия.',
            'superAdminTrustPolicy.invalid': 'Введите корректные значения.',
        }[key] ?? key),
    }),
}))

describe('SuperAdminTrustPolicyPanel', () => {
    beforeEach(() => {
        mocks.update.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(policy) }))
    })

    it('renders localized policy fields and preserves the update payload', async () => {
        const user = userEvent.setup()
        render(<SuperAdminTrustPolicyPanel />)

        expect(screen.getByRole('heading', { name: 'Доверие и rollout' })).toBeVisible()
        expect(screen.getByLabelText('Версия политики')).toHaveValue('v1')
        await user.click(screen.getByRole('button', { name: 'Сохранить правила' }))

        expect(mocks.update).toHaveBeenCalledWith({
            policyVersion: 'v1',
            trustedMinimumRating: 4.5,
            trustedMinimumReviews: 10,
            trustedMinimumCompletedVisits: 20,
            trustedMaxNoShowRate: 0.1,
            trustedMaxComplaintRate: 0.2,
            trustedMaxResponseTimeMinutes: 60,
            reassessmentIntervalHours: 24,
            rollout: { enabled: true, marketIds: ['market-1'], percentage: 25 },
        })
    })

    it('announces invalid rollout values without sending a mutation', async () => {
        const user = userEvent.setup()
        render(<SuperAdminTrustPolicyPanel />)

        await user.clear(screen.getByLabelText('Процент rollout'))
        await user.click(screen.getByRole('button', { name: 'Сохранить правила' }))

        expect(screen.getByRole('alert')).toHaveTextContent('Введите корректные значения.')
        expect(mocks.update).not.toHaveBeenCalled()
    })
})
