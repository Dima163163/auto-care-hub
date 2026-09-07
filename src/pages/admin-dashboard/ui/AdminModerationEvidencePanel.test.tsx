import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AdminAutoCareModerationEvidence } from '@/entities/automotive-service'

import { AdminModerationEvidencePanel } from './AdminModerationEvidencePanel'

const mocks = vi.hoisted(() => ({
    decide: vi.fn(),
}))

const evidence = {
    id: 'evidence-1',
    providerId: 'provider-1',
    kind: 'review',
    label: 'Review evidence',
    status: 'pending',
    reference: null,
    notes: null,
    expiresAt: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    verifiedAt: null,
    provider: { id: 'provider-1', name: 'ProService', address: 'Moscow' },
    review: {
        id: 'review-1',
        authorName: 'Alex Driver',
        vehicleLabel: 'BMW X5',
        rating: 5,
        text: 'Great service',
        photoUrls: [],
        createdAt: '2026-09-08T09:00:00.000Z',
        status: 'pending',
    },
} as AdminAutoCareModerationEvidence

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareModerationEvidenceQuery: () => ({ data: [evidence], isLoading: false, error: null, refetch: vi.fn() }),
    useDecideAdminAutoCareModerationEvidenceMutation: () => [mocks.decide, { isLoading: false, error: null }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'adminModerationEvidence.title': 'Материалы для модерации',
            'adminModerationEvidence.description': 'Проверяйте материалы.',
            'adminModerationEvidence.filter': 'Статус материалов',
            'adminModerationEvidence.kindFilter': 'Тип материала',
            'adminModerationEvidence.all': 'Все',
            'adminModerationEvidence.allKinds': 'Все типы',
            'adminModerationEvidence.pending': 'Ожидают',
            'adminModerationEvidence.approved': 'Одобрены',
            'adminModerationEvidence.rejected': 'Отклонены',
            'adminModerationEvidence.empty': 'Материалов нет.',
            'adminModerationEvidence.provider': 'Сервис',
            'adminModerationEvidence.review': 'Отзыв',
            'adminModerationEvidence.media': 'Фото сервиса',
            'adminModerationEvidence.gallery': 'Галерея',
            'adminModerationEvidence.document': 'Документ сервиса',
            'adminModerationEvidence.privateDocument': 'Приватный документ.',
            'adminModerationEvidence.documentReference': 'Ключ хранения',
            'adminModerationEvidence.documentExpires': 'Действует до',
            'adminModerationEvidence.author': 'Автор',
            'adminModerationEvidence.reviewStatus': 'Статус отзыва',
            'adminModerationEvidence.note': 'Комментарий модератора',
            'adminModerationEvidence.placeholder': 'Укажите основание решения…',
            'adminModerationEvidence.required': 'Добавьте комментарий перед принятием решения.',
            'adminModerationEvidence.approve': 'Одобрить',
            'adminModerationEvidence.reject': 'Отклонить',
            'adminModerationEvidence.decided': 'Решение сохранено',
            'adminModerationEvidence.failedDecision': 'Ошибка решения.',
            'adminModerationEvidence.failed': 'Ошибка загрузки.',
            'adminModerationEvidence.noMedia': 'Фото отсутствует.',
            'adminModerationEvidence.pendingReview': 'На проверке',
            'adminModerationEvidence.approvedReview': 'Опубликован',
            'adminModerationEvidence.rejectedReview': 'Отклонён',
            'common.loading': 'Загрузка',
            'common.retry': 'Повторить',
            'common.notProvided': 'Не указано',
        }[key] ?? key),
    }),
}))

describe('AdminModerationEvidencePanel', () => {
    beforeEach(() => {
        mocks.decide.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(evidence) }))
    })

    it('requires a localized reason and preserves the moderation decision payload', async () => {
        const user = userEvent.setup()
        render(<AdminModerationEvidencePanel />)

        expect(screen.getByRole('heading', { name: 'Материалы для модерации' })).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'Одобрить' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Добавьте комментарий перед принятием решения.')
        expect(mocks.decide).not.toHaveBeenCalled()

        await user.type(screen.getByPlaceholderText('Укажите основание решения…'), 'Основание')
        await user.click(screen.getByRole('button', { name: 'Одобрить' }))

        expect(mocks.decide).toHaveBeenCalledWith({ id: 'evidence-1', status: 'approved', reason: 'Основание' })
    })
})
