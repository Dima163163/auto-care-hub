import type { AutoCareDiscoveryQuery, AutoCareDiscoveryResponse } from './autocare.types.js'

const DISCOVERY_CACHE_TTL_MS = 5_000
const DISCOVERY_CACHE_MAX_ENTRIES = 500

type CacheEntry = {
    response: AutoCareDiscoveryResponse
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/** Stable cache keys keep semantically identical query objects in one bucket. */
export function getDiscoveryCacheKey(input: AutoCareDiscoveryQuery) {
    return Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('&')
}

export function getDiscoveryCache(key: string, now = Date.now()) {
    const entry = cache.get(key)
    if (!entry) return null
    if (entry.expiresAt <= now) {
        cache.delete(key)
        return null
    }
    // Refresh insertion order so the oldest entry is evicted first.
    cache.delete(key)
    cache.set(key, entry)
    return entry.response
}

export function setDiscoveryCache(key: string, response: AutoCareDiscoveryResponse, now = Date.now()) {
    cache.delete(key)
    cache.set(key, { response, expiresAt: now + DISCOVERY_CACHE_TTL_MS })
    while (cache.size > DISCOVERY_CACHE_MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value
        if (typeof oldestKey !== 'string') break
        cache.delete(oldestKey)
    }
}

export function clearDiscoveryCache() {
    cache.clear()
}

export const discoveryCachePolicy = {
    ttlMs: DISCOVERY_CACHE_TTL_MS,
    maxEntries: DISCOVERY_CACHE_MAX_ENTRIES,
} as const
