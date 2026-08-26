import { describe, expect, it } from 'vitest'

import { clearDiscoveryCache, discoveryCachePolicy, getDiscoveryCache, getDiscoveryCacheKey, setDiscoveryCache } from './discovery-cache.js'

describe('discovery cache', () => {
    it('creates stable keys regardless of query property order', () => {
        const first = getDiscoveryCacheKey({ marketId: 'moscow', radiusKm: 25, limit: 8, sort: 'recommended' })
        const second = getDiscoveryCacheKey({ sort: 'recommended', limit: 8, radiusKm: 25, marketId: 'moscow' })
        expect(first).toBe(second)
    })

    it('expires entries and keeps the cache bounded', () => {
        clearDiscoveryCache()
        const response = { items: [], nextCursor: null }
        setDiscoveryCache('one', response, 100)
        expect(getDiscoveryCache('one', 104)).toEqual(response)
        expect(getDiscoveryCache('one', 100 + discoveryCachePolicy.ttlMs)).toBeNull()

        for (let index = 0; index < discoveryCachePolicy.maxEntries + 2; index += 1) {
            setDiscoveryCache(`key-${index}`, response, 1_000)
        }
        expect(getDiscoveryCache('key-0', 1_000)).toBeNull()
        expect(getDiscoveryCache(`key-${discoveryCachePolicy.maxEntries + 1}`, 1_000)).toEqual(response)
        clearDiscoveryCache()
    })
})
