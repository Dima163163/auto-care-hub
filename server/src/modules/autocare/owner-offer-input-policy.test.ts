import { describe, expect, it } from 'vitest'
import { areAutoCareOfferResourcesCompatible, normalizeAutoCareOfferProviderUuid, normalizeAutoCareOfferUuid, normalizeOwnerAutoCareOfferInput } from './owner-offer-input-policy.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const offerId = '22222222-2222-4222-8222-222222222222'
const resourceId = '33333333-3333-4333-8333-333333333333'
const base = {
    description: '  Замена масла  ',
    priceFromMinor: 2_500,
    bookingMode: 'instant',
    requiredResourceTypes: ['bay', 'specialist'],
    requiredResourceIds: [resourceId.toUpperCase()],
}

describe('owner offer input policy', () => {
    it('canonicalizes provider and offer UUIDs', () => {
        expect(normalizeAutoCareOfferProviderUuid(` ${providerId.toUpperCase()} `)).toBe(providerId)
        expect(normalizeAutoCareOfferUuid(` ${offerId.toUpperCase()} `)).toBe(offerId)
        expect(normalizeAutoCareOfferUuid('offer-1')).toBeNull()
    })

    it('normalizes bounded update fields and resource references', () => {
        expect(normalizeOwnerAutoCareOfferInput(base)).toEqual({
            description: 'Замена масла',
            priceFromMinor: 2_500,
            bookingMode: 'instant',
            requiredResourceTypes: ['bay', 'specialist'],
            requiredResourceIds: [resourceId],
        })
        expect(normalizeOwnerAutoCareOfferInput({ description: null, priceFromMinor: 0 })).toEqual({ description: null, priceFromMinor: 0 })
    })

    it('rejects unknown fields, malformed prices and invalid resources', () => {
        expect(normalizeOwnerAutoCareOfferInput({ ...base, providerId })).toBeNull()
        expect(normalizeOwnerAutoCareOfferInput({ ...base, priceFromMinor: -1 })).toBeNull()
        expect(normalizeOwnerAutoCareOfferInput({ ...base, priceFromMinor: 10_000_000_001 })).toBeNull()
        expect(normalizeOwnerAutoCareOfferInput({ ...base, requiredResourceTypes: ['unknown'] })).toBeNull()
        expect(normalizeOwnerAutoCareOfferInput({ ...base, requiredResourceIds: ['resource-1'] })).toBeNull()
        expect(normalizeOwnerAutoCareOfferInput({ ...base, description: 'x'.repeat(2_001) })).toBeNull()
    })

    it('deduplicates resource references without silently truncating them', () => {
        expect(normalizeOwnerAutoCareOfferInput({ ...base, requiredResourceIds: [resourceId, resourceId.toUpperCase()] })?.requiredResourceIds).toEqual([resourceId])
        expect(normalizeOwnerAutoCareOfferInput({ ...base, requiredResourceIds: Array.from({ length: 9 }, () => resourceId) })).toBeNull()
    })

    it('requires selected resources to match declared resource types', () => {
        expect(areAutoCareOfferResourcesCompatible([{ type: 'bay' }, { type: 'specialist' }], ['bay', 'specialist'])).toBe(true)
        expect(areAutoCareOfferResourcesCompatible([{ type: 'lift' }], ['bay'])).toBe(false)
        expect(areAutoCareOfferResourcesCompatible([{ type: 'lift' }], undefined)).toBe(true)
    })
})
