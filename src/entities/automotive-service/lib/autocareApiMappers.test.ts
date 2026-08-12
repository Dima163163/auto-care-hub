import { describe, expect, it } from 'vitest'

import { mapAutoCareDiscoveryItem, mapAutoCareProviderProfile } from './autocareApiMappers'

const provider = {
    id: 'provider-1',
    name: 'ProService',
    description: 'Description',
    status: 'active' as const,
    verified: true,
    yearsActive: 8,
    staffCount: 24,
    rating: 4.7,
    reviewCount: 256,
    bonusSummary: '5% back',
    coverImageUrl: '/images/autocare/providers/proservice.webp',
    galleryImageUrls: ['/images/autocare/providers/proservice.webp'],
    location: { id: 'location-1', marketId: 'market-1', address: 'Moscow', hours: '08:00–21:00', latitude: 55.7, longitude: 37.6 },
}

const offer = {
    id: 'offer-1', serviceDefinitionId: 'definition-oil-change', serviceSlug: 'oil-change', serviceLabels: { ru: 'Замена масла' },
    priceFromMinor: 290000, priceToMinor: null, currencyCode: 'RUB', durationMinutes: 60,
    inclusions: ['Oil and filter'], warrantyText: 'Warranty', active: true,
}

describe('AutoCare API mappers', () => {
    it('maps discovery price from minor units and preserves image fallback input', () => {
        const result = mapAutoCareDiscoveryItem({ provider, offer, distanceKm: 2.1, nextSlot: 'Today, 14:30' })
        expect(result.price).toBe(2900)
        expect(result.distance).toBe('2.1 km')
        expect(result.image).toContain('/images/autocare/')
    })

    it('maps provider offers into the existing profile view model', () => {
        const result = mapAutoCareProviderProfile({ ...provider, offers: [offer] })
        expect(result.offerings[0]?.serviceId).toBe('oil-change')
        expect(result.offerings[0]?.priceLabel).toMatch(/2.?900/)
        expect(result.about).toBe('Description')
    })
})
