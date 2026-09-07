import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnerClientsPage } from './OwnerClientsPage'

const mocks = vi.hoisted(() => ({
    locale: 'ru' as 'en' | 'ru',
    requests: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareServiceRequestsQuery: () => ({
        data: mocks.requests,
        error: null,
        isLoading: false,
        refetch: vi.fn(),
    }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: mocks.locale,
        t: (key: string) => ({
            'autocare.ownerClientsDefaultName': mocks.locale === 'ru' ? 'Клиент AutoCare' : 'AutoCare customer',
            'autocare.ownerClientsDescription': mocks.locale === 'ru' ? 'Контакты и обращения из заявок.' : 'Contacts and request summaries.',
            'autocare.ownerClientsEmpty': mocks.locale === 'ru' ? 'Клиенты появятся после первых заявок.' : 'Customers will appear after the first requests.',
            'autocare.ownerClientsEyebrow': mocks.locale === 'ru' ? 'Рабочая область владельца' : 'Service owner workspace',
            'autocare.ownerClientsIssue': mocks.locale === 'ru' ? 'Описание проблемы' : 'Issue summary',
            'autocare.ownerClientsNoIssue': mocks.locale === 'ru' ? 'Описание проблемы не указано.' : 'No issue description was provided.',
            'autocare.ownerClientsRequests': mocks.locale === 'ru' ? 'Заявок' : 'Requests',
            'autocare.ownerClientsTitle': mocks.locale === 'ru' ? 'Клиенты сервиса' : 'Service customers',
            'common.failedToLoad': mocks.locale === 'ru' ? 'Не удалось загрузить.' : 'Failed to load.',
            'common.loading': mocks.locale === 'ru' ? 'Загрузка…' : 'Loading…',
            'common.retry': mocks.locale === 'ru' ? 'Повторить' : 'Retry',
        }[key] ?? key),
    }),
}))

describe('OwnerClientsPage', () => {
    beforeEach(() => {
        mocks.locale = 'ru'
        mocks.requests = [{
            address: 'Москва, ул. Льва Толстого, 18',
            contactSnapshot: { email: 'driver@example.com' },
            createdAt: '2026-09-01T09:00:00.000Z',
            id: 'request-1',
            note: null,
            serviceLabels: { ru: 'Замена масла' },
            serviceSlug: 'oil-change',
            updatedAt: '2026-09-01T10:00:00.000Z',
        }]
    })

    it('uses localized copy and fallback client names for Russian', () => {
        render(<OwnerClientsPage />)

        expect(screen.getByRole('heading', { name: 'Клиенты сервиса' })).toBeVisible()
        expect(screen.getByRole('heading', { name: 'Клиент AutoCare' })).toBeVisible()
        expect(screen.getByText('Описание проблемы не указано.')).toBeVisible()
        expect(screen.getByText('Замена масла')).toBeVisible()
    })

    it('keeps the selected locale when rendering customer labels', () => {
        mocks.locale = 'en'
        mocks.requests = [{
            address: '18 Leo Tolstoy Street',
            contactSnapshot: { name: 'Alex Driver' },
            createdAt: '2026-09-01T09:00:00.000Z',
            id: 'request-2',
            note: 'Brake inspection',
            serviceLabels: { en: 'Oil change' },
            serviceSlug: 'oil-change',
            updatedAt: '2026-09-01T10:00:00.000Z',
        }]

        render(<OwnerClientsPage />)

        expect(screen.getByRole('heading', { name: 'Service customers' })).toBeVisible()
        expect(screen.getByRole('heading', { name: 'Alex Driver' })).toBeVisible()
        expect(screen.getByText('Requests: 1')).toBeVisible()
        expect(screen.getByText('Oil change')).toBeVisible()
    })
})
