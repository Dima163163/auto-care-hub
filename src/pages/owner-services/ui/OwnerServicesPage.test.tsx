import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnerServicesPage } from './OwnerServicesPage'

const mocks = vi.hoisted(() => ({
    locale: 'ru' as 'en' | 'ru',
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAutoCareServiceDefinitionsQuery: () => ({
        data: [{ categorySlug: 'maintenance' }],
        error: null,
        isLoading: false,
        refetch: vi.fn(),
    }),
    useGetOwnerAutoCareProvidersQuery: () => ({
        data: [{ id: 'provider-1' }],
        error: null,
        isLoading: false,
        refetch: vi.fn(),
    }),
}))

vi.mock('./OwnerBranchServices', () => ({
    OwnerBranchServices: () => null,
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: mocks.locale,
        t: (key: string) => ({
            'autocare.ownerServicesPageAddress': mocks.locale === 'ru' ? 'Адрес' : 'Address',
            'autocare.ownerServicesPageBranchServices': mocks.locale === 'ru' ? 'услуг' : 'services',
            'autocare.ownerServicesPageCategories': mocks.locale === 'ru' ? 'Категории' : 'Categories',
            'autocare.ownerServicesPageDefinitions': mocks.locale === 'ru' ? 'Стандартные услуги' : 'Standard services',
            'autocare.ownerServicesPageDescription': mocks.locale === 'ru' ? 'Настраивайте предложения отдельно.' : 'Manage offers separately.',
            'autocare.ownerServicesPageEyebrow': mocks.locale === 'ru' ? 'Каталог автоуслуг' : 'Automotive service catalogue',
            'autocare.ownerServicesPageHideAll': mocks.locale === 'ru' ? 'Скрыть все услуги' : 'Hide all services',
            'autocare.ownerServicesPageLocations': mocks.locale === 'ru' ? 'Филиалы сервиса' : 'Service locations',
            'autocare.ownerServicesPageLocationAction': mocks.locale === 'ru' ? 'Управлять филиалами' : 'Manage locations',
            'autocare.ownerServicesPageShowAll': mocks.locale === 'ru' ? 'Показать все услуги' : 'Show all services',
            'autocare.ownerServicesPageTitle': mocks.locale === 'ru' ? 'Услуги и цены' : 'Services and pricing',
            'common.loading': mocks.locale === 'ru' ? 'Загрузка…' : 'Loading…',
            'common.failedToLoad': mocks.locale === 'ru' ? 'Не удалось загрузить.' : 'Failed to load.',
            'common.retry': mocks.locale === 'ru' ? 'Повторить' : 'Retry',
        }[key] ?? key),
    }),
}))

function renderPage() {
    return render(
        <MemoryRouter>
            <OwnerServicesPage />
        </MemoryRouter>,
    )
}

describe('OwnerServicesPage', () => {
    beforeEach(() => {
        mocks.locale = 'ru'
    })

    it('renders the translated catalogue surface in Russian', () => {
        renderPage()

        expect(screen.getByRole('heading', { name: 'Услуги и цены' })).toBeVisible()
        expect(screen.getByText('Каталог автоуслуг')).toBeVisible()
        expect(screen.getByRole('button', { name: 'Скрыть все услуги' })).toBeVisible()
    })

    it('keeps the expand-all control localized in English', async () => {
        mocks.locale = 'en'
        renderPage()
        const user = userEvent.setup()

        expect(screen.getByRole('heading', { name: 'Services and pricing' })).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'Hide all services' }))

        expect(screen.getByRole('button', { name: 'Show all services' })).toBeVisible()
    })
})
