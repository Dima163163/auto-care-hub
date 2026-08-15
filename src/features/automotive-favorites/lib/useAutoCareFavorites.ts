import { useCallback, useEffect, useMemo, useState } from 'react'

import {
    useAddAutoCareFavoriteMutation,
    useGetAutoCareFavoritesQuery,
    useRemoveAutoCareFavoriteMutation,
    useSyncAutoCareFavoritesMutation,
    type AutoCareFavorite,
    type ProviderPreview,
} from '@/entities/automotive-service'
import { IS_REAL_API } from '@/shared/config/api'
import { useGetMeQuery } from '@/features/auth'

const STORAGE_KEY = 'autocare-hub:automotive-favorites'
const CHANGE_EVENT = 'autocare-hub:automotive-favorites-change'
const syncAttempts = new Map<string, string>()

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

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mapFavoriteToPreview(favorite: AutoCareFavorite): ProviderPreview {
    const offer = favorite.offer
    const location = favorite.provider.location
    return {
        id: favorite.providerId,
        name: favorite.provider.name,
        rating: favorite.provider.rating,
        reviewCount: favorite.provider.reviewCount,
        distance: '—',
        price: (offer?.priceFromMinor ?? 0) / 100,
        priceTo: offer?.priceToMinor == null ? null : offer.priceToMinor / 100,
        currency: offer?.currencyCode ?? 'RUB',
        nextSlot: '—',
        image: favorite.provider.coverImageUrl,
        logoUrl: favorite.provider.logoUrl,
        bonus: favorite.provider.bonusSummary ?? undefined,
        verified: favorite.provider.verified,
        mapPosition: location.latitude !== null && location.longitude !== null ? [location.latitude, location.longitude] : undefined,
        serviceIds: offer?.serviceSlug ? [offer.serviceSlug] : [],
        servicePrices: offer?.serviceSlug ? { [offer.serviceSlug]: (offer.priceFromMinor ?? 0) / 100 } : {},
        address: location.address,
        priceType: offer?.priceType,
        inclusions: offer?.inclusions,
        warrantyMonths: offer?.warrantyText ? 12 : null,
        brandSpecializations: favorite.provider.brandSpecializations,
        isMultibrand: favorite.provider.isMultibrand,
        trustScore: favorite.provider.trustScore,
        trustBadge: favorite.provider.trustBadge,
    }
}

export function useAutoCareFavorites() {
    const { data: user } = useGetMeQuery()
    const [ids, setIds] = useState<string[]>(readFavoriteIds)
    const isClient = user?.role === 'client'
    const { data: remoteFavorites } = useGetAutoCareFavoritesQuery(undefined, { skip: !isClient })
    const [addFavorite] = useAddAutoCareFavoriteMutation()
    const [removeFavorite] = useRemoveAutoCareFavoriteMutation()
    const [syncFavorites] = useSyncAutoCareFavoritesMutation()

    useEffect(() => {
        const sync = () => setIds(readFavoriteIds())
        window.addEventListener('storage', sync)
        window.addEventListener(CHANGE_EVENT, sync)
        return () => {
            window.removeEventListener('storage', sync)
            window.removeEventListener(CHANGE_EVENT, sync)
        }
    }, [])

    useEffect(() => {
        if (!user || !isClient || ids.length === 0) return
        const providerIds = ids.filter((id) => !IS_REAL_API || isUuid(id))
        if (providerIds.length === 0) return
        const fingerprint = providerIds.slice().sort().join('|')
        if (syncAttempts.get(user.id) === fingerprint) return
        syncAttempts.set(user.id, fingerprint)
        void syncFavorites({ providerIds }).unwrap().catch(() => {
            syncAttempts.delete(user.id)
        })
    }, [ids, isClient, syncFavorites, user])

    const remoteIds = useMemo(() => remoteFavorites?.map((favorite) => favorite.providerId) ?? [], [remoteFavorites])
    const favoriteIds = useMemo(() => new Set([...ids, ...remoteIds]), [ids, remoteIds])
    const favoriteProviders = useMemo(() => remoteFavorites?.map(mapFavoriteToPreview) ?? [], [remoteFavorites])

    const toggle = useCallback((providerId: string) => {
        const isFavorite = favoriteIds.has(providerId)
        setIds((current) => {
            const next = isFavorite ? current.filter((id) => id !== providerId) : [providerId, ...current]
            writeFavoriteIds(next)
            return next
        })
        if (!isClient) return
        if (isFavorite) {
            void removeFavorite(providerId).unwrap().catch(() => undefined)
        } else {
            void addFavorite({ providerId }).unwrap().catch(() => undefined)
        }
    }, [addFavorite, favoriteIds, isClient, removeFavorite])

    return {
        favoriteIds,
        favoriteProviders,
        isFavorite: (providerId: string) => favoriteIds.has(providerId),
        toggle,
    }
}
