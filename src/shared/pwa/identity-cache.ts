const IDENTITY_CACHE_PREFIX = 'autocare-hub-private-'

export async function clearIdentityScopedPwaCaches() {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return
    }

    try {
        const cacheNames = await window.caches.keys()
        const identityCacheNames = cacheNames.filter((name) =>
            name.startsWith(IDENTITY_CACHE_PREFIX),
        )

        await Promise.all(identityCacheNames.map((name) => window.caches.delete(name)))
    } catch {
        // Cache cleanup must never prevent auth state from being cleared.
    }
}
