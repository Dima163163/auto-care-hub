const RETIRED_PUBLIC_CACHE_NAMES: readonly string[] = [
    'autocare-hub-public-providers',
]

export async function clearRetiredPublicPwaCaches() {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return
    }

    try {
        const cacheNames = await window.caches.keys()
        const retiredCacheNames = cacheNames.filter((name) =>
            RETIRED_PUBLIC_CACHE_NAMES.includes(name),
        )

        await Promise.all(retiredCacheNames.map((name) => window.caches.delete(name)))
    } catch (error) {
        console.warn('Failed to clear retired public PWA caches', error)
    }
}
