import { describe, expect, it } from 'vitest'
import { normalizeAutoCareFavoriteLocationUuid, normalizeAutoCareFavoriteProviderIds, normalizeAutoCareFavoriteProviderUuid } from './autocare-favorites-input-policy.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const locationId = '22222222-2222-4222-8222-222222222222'

describe('AutoCare favorites input policy', () => {
    it('canonicalizes provider and optional location UUIDs', () => {
        expect(normalizeAutoCareFavoriteProviderUuid(` ${providerId.toUpperCase()} `)).toBe(providerId)
        expect(normalizeAutoCareFavoriteLocationUuid(` ${locationId.toUpperCase()} `)).toBe(locationId)
        expect(normalizeAutoCareFavoriteProviderUuid('provider-1')).toBeNull()
    })

    it('normalizes and deduplicates sync provider ids within the bounded list', () => {
        expect(normalizeAutoCareFavoriteProviderIds([providerId, ` ${providerId.toUpperCase()} `])).toEqual([providerId])
        expect(normalizeAutoCareFavoriteProviderIds([])).toEqual([])
    })

    it('rejects malformed or oversized sync lists', () => {
        expect(normalizeAutoCareFavoriteProviderIds(['provider-1'])).toBeNull()
        expect(normalizeAutoCareFavoriteProviderIds([providerId, 'invalid'])).toBeNull()
        expect(normalizeAutoCareFavoriteProviderIds(Array.from({ length: 101 }, () => providerId))).toBeNull()
        expect(normalizeAutoCareFavoriteProviderIds(null)).toBeNull()
    })
})
