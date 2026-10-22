import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ProviderPreview } from '@/entities/automotive-service'
import { loadTranslations } from '@/shared/config/translations'
import { t } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { ComparisonTable } from './ComparisonTable'

const base: ProviderPreview = {
    id: 'provider-1',
    name: 'Provider',
    rating: 4.8,
    reviewCount: 12,
    distance: '2 km',
    price: 1700,
    currency: 'RUB',
    nextSlot: 'Today, 11:30',
    verified: true,
    brandSpecializations: [],
    isMultibrand: true,
}

function provider(id: string, fields: Partial<ProviderPreview>): ProviderPreview {
    return { ...base, id, name: id, ...fields }
}

describe('ComparisonTable offer semantics', () => {
    it('keeps price, booking and warranty conditions aligned with provider cards', () => {
        render(
            <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key, params) => t(key, params, 'en') }}>
                <ComparisonTable providers={[
                    provider('fixed', { priceType: 'fixed', bookingMode: 'instant', warrantyMonths: 12 }),
                    provider('from', { priceType: 'from', bookingMode: 'request', currency: 'USD' }),
                    provider('range', { priceType: 'range', bookingMode: 'request', currency: 'EUR', priceTo: 2200 }),
                    provider('quote', { priceType: 'quote_required', bookingMode: 'instant', warrantyText: 'Warranty applies to labor' }),
                ]} />
            </I18nContext.Provider>,
        )

        const rows = screen.getAllByRole('row')
        const prices = Array.from(rows[1]!.querySelectorAll('td'), (cell) => cell.textContent ?? '')
        expect(prices[0]).toContain('RUB')
        expect(prices[0]).not.toContain('from')
        expect(prices[1]).toMatch(/^from \$/)
        expect(prices[2]).toMatch(/€.*–.*€/)
        expect(prices[3]).toBe('Quote required')

        const times = Array.from(rows[4]!.querySelectorAll('td'), (cell) => cell.textContent ?? '')
        expect(times).toEqual([
            'Today, 11:30',
            'Time to be confirmed by the service',
            'Time to be confirmed by the service',
            'Time to be confirmed by the service',
        ])

        const warranties = Array.from(rows[5]!.querySelectorAll('td'), (cell) => cell.textContent ?? '')
        expect(warranties).toEqual(['12 month warranty', 'Not provided', 'Not provided', 'Warranty applies to labor'])
    })

    it('keeps request and quote qualifiers in Russian', async () => {
        await loadTranslations('ru')
        render(
            <I18nContext.Provider value={{ locale: 'ru', setLocale: vi.fn(), t: (key, params) => t(key, params, 'ru') }}>
                <ComparisonTable providers={[
                    provider('request', { priceType: 'from', bookingMode: 'request' }),
                    provider('quote', { priceType: 'quote_required', bookingMode: 'request' }),
                ]} />
            </I18nContext.Provider>,
        )

        const rows = screen.getAllByRole('row')
        const prices = Array.from(rows[1]!.querySelectorAll('td'), (cell) => cell.textContent ?? '')
        expect(prices[0]).toMatch(/^от /)
        expect(prices[1]).toBe('Цена по запросу')
        const times = Array.from(rows[4]!.querySelectorAll('td'), (cell) => cell.textContent ?? '')
        expect(times).toEqual(['Точное время подтвердит сервис', 'Точное время подтвердит сервис'])
    })
})
