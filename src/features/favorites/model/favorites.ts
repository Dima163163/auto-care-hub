export const FAVORITES_STORAGE_KEY = 'autocare-hub:favorites'

export type FavoriteCabinet = {
    id: string
    title: string
    area: string
    price: string
    image?: string | undefined
    to: string
}

export function readFavorites(): FavoriteCabinet[] {
    if (typeof window === 'undefined') return []

    try {
        const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
        if (!rawValue) return []

        const parsedValue = JSON.parse(rawValue)

        return Array.isArray(parsedValue) ? parsedValue : []
    } catch {
        return []
    }
}

export function writeFavorites(favorites: FavoriteCabinet[]) {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
    window.dispatchEvent(new Event('autocare-hub:favorites-change'))
}

export function toggleLocalFavorite(
    favorites: FavoriteCabinet[],
    favorite: FavoriteCabinet,
) {
    const isAlreadyFavorite = favorites.some((item) => item.id === favorite.id)

    return isAlreadyFavorite
        ? favorites.filter((item) => item.id !== favorite.id)
        : [favorite, ...favorites]
}

export function mergeFavoriteCabinets(
    localFavorites: FavoriteCabinet[],
    remoteFavorites: FavoriteCabinet[],
) {
    const seenIds = new Set<string>()
    const merged: FavoriteCabinet[] = []

    for (const favorite of [...remoteFavorites, ...localFavorites]) {
        if (seenIds.has(favorite.id)) continue

        seenIds.add(favorite.id)
        merged.push(favorite)
    }

    return merged
}

export function removeSyncedFavorites(
    favorites: FavoriteCabinet[],
    syncedIds: string[],
) {
    const syncedIdSet = new Set(syncedIds)

    return favorites.filter((favorite) => !syncedIdSet.has(favorite.id))
}
