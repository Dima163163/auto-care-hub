import { describe, expect, it } from 'vitest'
import { normalizeAutoCareProviderLocationIds } from './provider-location-input-policy.js'

const marketId = '11111111-1111-4111-8111-111111111111'
const zoneId = '22222222-2222-4222-8222-222222222222'

describe('owner provider location input policy', () => {
    it('canonicalizes market and optional zone UUIDs', () => {
        expect(normalizeAutoCareProviderLocationIds({ marketId: `  ${marketId.toUpperCase()} `, zoneId: ` ${zoneId.toUpperCase()} ` })).toEqual({ marketId, zoneId })
        expect(normalizeAutoCareProviderLocationIds({ marketId, zoneId: null })).toEqual({ marketId, zoneId: null })
        expect(normalizeAutoCareProviderLocationIds({ marketId })).toEqual({ marketId, zoneId: null })
    })

    it('rejects malformed or non-object references before repository lookup', () => {
        expect(normalizeAutoCareProviderLocationIds(null)).toBeNull()
        expect(normalizeAutoCareProviderLocationIds({ marketId: 'market-1', zoneId })).toBeNull()
        expect(normalizeAutoCareProviderLocationIds({ marketId, zoneId: 'zone-1' })).toBeNull()
        expect(normalizeAutoCareProviderLocationIds({ marketId, zoneId: 42 })).toBeNull()
        expect(normalizeAutoCareProviderLocationIds([marketId, zoneId])).toBeNull()
    })
})
