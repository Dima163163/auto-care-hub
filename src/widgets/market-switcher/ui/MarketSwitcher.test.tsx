import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTOCARE_MARKET_STORAGE_KEY } from '@/shared/lib/market-preference'

import { MarketSwitcher } from './MarketSwitcher'

const mocked = vi.hoisted(() => ({
    markets: [
        { id: 'market-moscow', cityCode: 'moscow', cityName: 'Москва', countryName: 'Россия', currencyCode: 'RUB', launchReady: true },
        { id: 'market-samara', cityCode: 'samara', cityName: 'Самара', countryName: 'Россия', currencyCode: 'RUB', launchReady: true },
    ],
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAutoCareMarketsQuery: () => ({ data: mocked.markets, isLoading: false, isError: false, refetch: vi.fn() }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ t: (key: string) => ({
        'autocare.locationLabel': 'Локация',
        'autocare.selectCity': 'Выберите город',
    }[key] ?? key) }),
}))

function LocationState() {
    const location = useLocation()
    return <output aria-label="Текущий адрес">{location.pathname}{location.search}</output>
}

describe('MarketSwitcher stale market normalization', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it('normalizes an invalid URL market and stored preference to the existing fallback', async () => {
        window.localStorage.setItem(AUTOCARE_MARKET_STORAGE_KEY, 'missing-city')
        render(
            <MemoryRouter initialEntries={['/autocare?market=missing-city&zone=old-zone&service=brakes']}>
                <Routes>
                    <Route path="/autocare" element={<><MarketSwitcher /><LocationState /></>} />
                </Routes>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByLabelText('Текущий адрес')).toHaveTextContent('/autocare?market=moscow&service=brakes')
            expect(window.localStorage.getItem(AUTOCARE_MARKET_STORAGE_KEY)).toBe('moscow')
        })
        expect(screen.getByRole('button', { name: 'Локация: Москва' })).toBeVisible()
    })
})
