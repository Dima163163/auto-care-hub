import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'autocare-hub:automotive-favorites'
const CHANGE_EVENT = 'autocare-hub:automotive-favorites-change'

function readFavoriteIds(): string[] {
    if (typeof window === 'undefined') return []

    try {
        const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
        return Array.isArray(value) && value.every((id): id is string => typeof id === 'string') ? value : []
    } catch {
        return []
    }
}

function writeFavoriteIds(ids: string[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useAutoCareFavorites() {
    const [ids, setIds] = useState<string[]>(readFavoriteIds)

    useEffect(() => {
        const sync = () => setIds(readFavoriteIds())
        window.addEventListener('storage', sync)
        window.addEventListener(CHANGE_EVENT, sync)
        return () => {
            window.removeEventListener('storage', sync)
            window.removeEventListener(CHANGE_EVENT, sync)
        }
    }, [])

    const toggle = useCallback((providerId: string) => {
        setIds((current) => {
            const next = current.includes(providerId) ? current.filter((id) => id !== providerId) : [providerId, ...current]
            writeFavoriteIds(next)
            return next
        })
    }, [])

    const favoriteIds = useMemo(() => new Set(ids), [ids])

    return { favoriteIds, isFavorite: (providerId: string) => favoriteIds.has(providerId), toggle }
}
