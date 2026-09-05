import { describe, expect, it } from 'vitest'

import { normalizeAutoCareDiscoveryQuery } from './discovery-input-policy.js'

const zoneId = '11111111-1111-4111-8111-111111111111'

describe('discovery input policy', () => {
    it('applies bounded defaults and canonicalizes text values', () => {
        expect(normalizeAutoCareDiscoveryQuery({
            serviceId: '  brake-pads  ',
            providerName: '  ProService  ',
            marketId: '  moscow  ',
            radiusKm: 25,
            limit: 20,
        })).toMatchObject({ serviceId: 'brake-pads', providerName: 'ProService', marketId: 'moscow', radiusKm: 25, sort: 'recommended', limit: 20 })
        expect(normalizeAutoCareDiscoveryQuery({})).toEqual({ radiusKm: 25, sort: 'recommended', limit: 20 })
    })

    it('accepts the supported filters and canonical parent zone UUID', () => {
        expect(normalizeAutoCareDiscoveryQuery({
            zoneId: ` ${zoneId.toUpperCase()} `,
            radiusKm: 10,
            sort: 'distance_asc',
            limit: 8,
            minPrice: 100,
            maxPrice: 500,
            minRating: 4,
            priceType: 'from',
            availableToday: true,
            verifiedOnly: true,
            warrantyOnly: false,
            hasBonus: true,
            inclusion: '  photo  ',
            brandId: '  toyota  ',
        })).toMatchObject({ zoneId, sort: 'distance_asc', minPrice: 100, maxPrice: 500, minRating: 4, priceType: 'from', inclusion: 'photo', brandId: 'toyota' })
    })

    it('rejects malformed types, enums and values', () => {
        expect(normalizeAutoCareDiscoveryQuery({ radiusKm: 0 })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ radiusKm: Number.POSITIVE_INFINITY })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ limit: 51 })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ sort: 'random' })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ zoneId: 'zone-1' })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ verifiedOnly: 'true' })).toBeNull()
    })

    it('rejects unsafe ranges, oversized text and unknown fields', () => {
        expect(normalizeAutoCareDiscoveryQuery({ minPrice: 900, maxPrice: 100 })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ providerName: 'x'.repeat(161) })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery({ unknown: true })).toBeNull()
        expect(normalizeAutoCareDiscoveryQuery(null)).toBeNull()
    })
})
