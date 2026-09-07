import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareApiServiceDefinition, AutoCareCatalogGapRequest } from '@/entities/automotive-service'

import { AdminCatalogGapQueue } from './AdminCatalogGapQueue'

const mocks = vi.hoisted(() => ({ decide: vi.fn(), update: vi.fn() }))

const gapRequests = [{
    id: 'gap-1',
    requestedById: 'owner-1',
    providerId: 'provider-1',
    proposedSlug: 'wheel-alignment',
    categorySlug: 'maintenance',
    labels: { ru: 'Развал-схождение', en: 'Wheel alignment' },
    priceType: 'from',
    comparisonAttributes: ['front axle'],
    rationale: 'Owner proposal',
    status: 'pending',
    reviewedById: null,
    reviewReason: null,
    reviewedAt: null,
    createdAt: '2026-09-08T08:00:00.000Z',
    updatedAt: '2026-09-08T08:00:00.000Z',
}] as unknown as AutoCareCatalogGapRequest[]

const definitions = [{
    id: 'definition-1',
    slug: 'oil-change',
    categorySlug: 'maintenance',
    labels: { ru: 'Замена масла', en: 'Oil change' },
    priceType: 'fixed',
    comparisonAttributes: [],
    active: true,
}] as unknown as AutoCareApiServiceDefinition[]

vi.mock('@/entities/automotive-service', () => ({
    useDecideAdminCatalogGapRequestMutation: () => [mocks.decide, { isLoading: false }],
    useGetAdminCatalogGapRequestsQuery: () => ({ data: gapRequests, isLoading: false, error: null, refetch: vi.fn() }),
    useGetAutoCareServiceDefinitionsQuery: () => ({ data: definitions, isLoading: false }),
    useUpdateAdminAutoCareServiceDefinitionMutation: () => [mocks.update, { isLoading: false, isSuccess: false, error: null }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string) => ({
            'adminCatalogGapQueue.title': 'Очередь новых услуг',
            'adminCatalogGapQueue.description': 'Проверяйте предложения от владельцев.',
            'adminCatalogGapQueue.empty': 'Новых предложений нет.',
            'adminCatalogGapQueue.loading': 'Загрузка очереди…',
            'adminCatalogGapQueue.error': 'Не удалось загрузить очередь.',
            'adminCatalogGapQueue.approve': 'Добавить в каталог',
            'adminCatalogGapQueue.reject': 'Отклонить',
            'adminCatalogGapQueue.reason': 'Причина решения',
            'adminCatalogGapQueue.saved': 'Решение сохранено',
            'adminCatalogGapQueue.placeholder': 'Укажите причину',
            'adminCatalogGapQueue.editorTitle': 'Каталог услуг',
            'adminCatalogGapQueue.editorDescription': 'Редактируйте каталог.',
            'adminCatalogGapQueue.category': 'Категория',
            'adminCatalogGapQueue.labelRu': 'Название RU',
            'adminCatalogGapQueue.labelEn': 'Название EN',
            'adminCatalogGapQueue.priceType': 'Формат цены',
            'adminCatalogGapQueue.active': 'Показывать в каталоге',
            'adminCatalogGapQueue.save': 'Сохранить услугу',
            'adminCatalogGapQueue.saving': 'Сохраняем…',
            'adminCatalogGapQueue.savedDefinition': 'Услуга обновлена',
            'adminCatalogGapQueue.priceTypeFixed': 'Фиксированная',
            'adminCatalogGapQueue.priceTypeFrom': 'От указанной цены',
            'adminCatalogGapQueue.priceTypeRange': 'Диапазон цены',
            'adminCatalogGapQueue.priceTypeQuoteRequired': 'Нужна оценка',
            'common.notProvided': 'Не указано',
            'common.retry': 'Повторить',
        }[key] ?? key),
    }),
}))

describe('AdminCatalogGapQueue', () => {
    beforeEach(() => {
        mocks.decide.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.update.mockReset()
    })

    it('renders localized catalog labels and preserves the approval mutation', async () => {
        const user = userEvent.setup()
        render(<AdminCatalogGapQueue locale="ru" />)

        expect(screen.getByRole('heading', { name: 'Очередь новых услуг' })).toBeVisible()
        expect(screen.getByText('Развал-схождение')).toBeVisible()
        expect(screen.getByRole('option', { name: 'Фиксированная' })).toBeVisible()

        await user.click(screen.getByRole('button', { name: 'Добавить в каталог' }))

        expect(mocks.decide).toHaveBeenCalledWith({ id: 'gap-1', status: 'approved', reason: null })
    })
})
