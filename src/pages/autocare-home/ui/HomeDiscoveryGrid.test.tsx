import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nContext } from '@/shared/lib/i18n-context'
import type { TranslationKey } from '@/shared/lib/i18n'

import { HomeDiscoveryGrid } from './HomeDiscoveryGrid'

const mocks = vi.hoisted(() => ({
    markets: vi.fn(),
    zones: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAutoCareLocationZonesQuery: mocks.zones,
    useGetAutoCareMarketsQuery: mocks.markets,
}))

vi.mock('./ServiceCategoryGrid', () => ({
    ServiceCategoryGrid: () => <div data-testid="service-category-grid" />,
}))

const partnerCopy: Partial<Record<TranslationKey, string>> = {
    'autocare.exploreLocations': 'Исследуйте локации',
    'autocare.noLocations': 'Локации не найдены',
    'autocare.partnerAction': 'Стать партнёром',
    'autocare.partnerBenefitAnalytics': 'Аналитика',
    'autocare.partnerBenefitClients': 'Клиенты',
    'autocare.partnerBenefitControl': 'Управление',
    'autocare.partnerDescription': 'Описание',
    'autocare.partnerTitle': 'Для владельцев',
}

describe('HomeDiscoveryGrid', () => {
    beforeEach(() => {
        mocks.markets.mockReset().mockReturnValue({ data: [], isLoading: false })
        mocks.zones.mockReset().mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() })
    })

    it('opens the selected zone without presenting fixture counts as availability', () => {
        mocks.zones.mockReturnValue({ data: [{ id: 'zone-center', names: { ru: 'Центр' }, serviceCount: 1248, imageUrl: null }], isLoading: false, isError: false })
        render(<I18nContext.Provider value={{ locale: 'ru', setLocale: vi.fn(), t: (key: TranslationKey) => partnerCopy[key] ?? key }}><MemoryRouter><HomeDiscoveryGrid marketId="moscow" /></MemoryRouter></I18nContext.Provider>)
        expect(screen.getByRole('link', { name: /Центр/ })).toHaveAttribute('href', expect.stringContaining('zone=zone-center'))
        expect(screen.queryByText(/1[ ,\u00a0]?248/)).not.toBeInTheDocument()
    })

    it('keeps the partner CTA on the explicit primary foreground contract', () => {
        render(
            <I18nContext.Provider value={{
                locale: 'ru',
                setLocale: vi.fn(),
                t: (key: TranslationKey) => partnerCopy[key] ?? key,
            }}>
                <MemoryRouter>
                    <HomeDiscoveryGrid marketId="moscow" />
                </MemoryRouter>
            </I18nContext.Provider>,
        )

        expect(screen.getByRole('link', { name: 'Стать партнёром' })).toHaveClass('text-primary-foreground')
    })
})
