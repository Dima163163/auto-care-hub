import { describe, expect, it } from 'vitest'

import { automotiveServices } from './autocareMockData'
import { generatedProviderPreviews } from './autocareGeneratedProviders'

describe('generated AutoCare provider fixtures', () => {
    it('contains one hundred filterable providers with generated imagery', () => {
        expect(generatedProviderPreviews).toHaveLength(100)
        expect(new Set(generatedProviderPreviews.map((provider) => provider.id)).size).toBe(100)
        expect(generatedProviderPreviews.every((provider) => provider.image?.includes('/generated/'))).toBe(true)
        expect(generatedProviderPreviews.every((provider) => (provider.serviceIds?.length ?? 0) > 0)).toBe(true)
        expect(generatedProviderPreviews.some((provider) => provider.serviceIds?.length === automotiveServices.length)).toBe(true)
        expect(generatedProviderPreviews.some((provider) => (provider.serviceIds?.length ?? 0) < automotiveServices.length)).toBe(true)
        const offeredServices = new Set(generatedProviderPreviews.flatMap((provider) => provider.serviceIds ?? []))
        expect(automotiveServices.every((service) => offeredServices.has(service.id))).toBe(true)
        expect(generatedProviderPreviews.some((provider) => provider.isMultibrand)).toBe(true)
        expect(generatedProviderPreviews.some((provider) => provider.brandSpecializations.includes('bmw'))).toBe(true)
    })

    it('spreads prices, ratings, availability and map positions for filter checks', () => {
        const prices = new Set(generatedProviderPreviews.map((provider) => provider.price))
        const ratings = new Set(generatedProviderPreviews.map((provider) => provider.rating))
        const todayCount = generatedProviderPreviews.filter((provider) => provider.nextSlot.startsWith('Today')).length

        expect(prices.size).toBeGreaterThan(4)
        expect(ratings.size).toBeGreaterThan(4)
        expect(todayCount).toBeGreaterThan(50)
        expect(generatedProviderPreviews.every((provider) => provider.mapPosition?.length === 2)).toBe(true)
    })
})
