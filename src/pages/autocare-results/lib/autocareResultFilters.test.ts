import { describe, expect, it } from 'vitest'

import { getAutoCareResultFilters, writeAutoCareResultFilters } from './autocareResultFilters'

describe('AutoCare result filters', () => {
    it('restores all supported filters from a shareable URL', () => {
        const filters = getAutoCareResultFilters(new URLSearchParams('service=body-paint&market=ru-moscow&radius=50&sort=rating_desc&minPrice=2000&maxPrice=15000&minRating=4.7&priceType=quote_required&availableToday=true&verifiedOnly=true&warrantyOnly=true&hasBonus=true&inclusion=photo&brand=bmw'))

        expect(filters).toEqual({ serviceId: 'body-paint', providerName: '', marketId: 'ru-moscow', zoneId: '', radiusKm: 50, sort: 'rating_desc', minPrice: '2000', maxPrice: '15000', minRating: '4.7', priceType: 'quote_required', availableToday: true, verifiedOnly: true, warrantyOnly: true, hasBonus: true, inclusion: 'photo', brandId: 'bmw', vehicleModel: '', vehicleYear: '' })
    })

    it('rejects invalid numeric and enum values', () => {
        const filters = getAutoCareResultFilters(new URLSearchParams('radius=-1&sort=unknown&minRating=7&priceType=bad&availableToday=TRUE'))

        expect(filters.radiusKm).toBe(25)
        expect(filters.sort).toBe('recommended')
        expect(filters.minRating).toBe('')
        expect(filters.priceType).toBe('')
        expect(filters.availableToday).toBe(false)
    })

    it('leaves service unscoped when it is omitted so discovery can show all services', () => {
        expect(getAutoCareResultFilters(new URLSearchParams('market=ru-moscow')).serviceId).toBe('')
    })

    it('writes filter changes without losing the original search context', () => {
        const next = writeAutoCareResultFilters(new URLSearchParams('service=oil-change&market=ru-moscow'), { radiusKm: 50, minRating: '4.5', verifiedOnly: true, brandId: 'toyota' })

        expect(next.toString()).toContain('service=oil-change')
        expect(next.toString()).toContain('market=ru-moscow')
        expect(next.get('radius')).toBe('50')
        expect(next.get('minRating')).toBe('4.5')
        expect(next.get('verifiedOnly')).toBe('true')
        expect(next.get('brand')).toBe('toyota')
    })

    it('preserves provider-name searches in a shareable URL', () => {
        const next = writeAutoCareResultFilters(new URLSearchParams(), { providerName: 'ProService' })

        expect(next.get('provider')).toBe('ProService')
        expect(getAutoCareResultFilters(next).providerName).toBe('ProService')
    })
})
