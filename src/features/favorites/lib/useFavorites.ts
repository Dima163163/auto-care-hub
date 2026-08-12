import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Cabinet } from '@/entities/cabinet'
import { useGetMeQuery } from '@/features/auth'
import {
    useAddFavoriteMutation,
    useGetFavoritesQuery,
    useRemoveFavoriteMutation,
    useSyncFavoritesMutation,
} from '../api/favoritesApi'
import {
    mergeFavoriteCabinets,
    readFavorites,
    removeSyncedFavorites,
    toggleLocalFavorite,
    writeFavorites,
    type FavoriteCabinet,
} from '../model/favorites'
import { routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'
import { useTranslation } from '@/shared/lib/useTranslation'

const migrationRequests = new Map<string, Promise<unknown>>()
const migrationAttempts = new Map<string, string>()

function mapCabinetToFavorite(cabinet: Cabinet, priceLabel: string): FavoriteCabinet {
    const coverPhoto = cabinet.photos[0]

    return {
        id: cabinet.id,
        title: cabinet.title,
        area: cabinet.city,
        price: `${formatCurrency(cabinet.pricePerHour)} ${priceLabel}`,
        image: coverPhoto ? getMediaUrl(coverPhoto) : undefined,
        to: routePaths.cabinetDetails(cabinet.id),
    }
}

export function useFavorites() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const [localFavorites, setLocalFavorites] = useState<FavoriteCabinet[]>(readFavorites)
    const { data: remoteCabinets, isLoading: isRemoteLoading } = useGetFavoritesQuery(undefined, {
        skip: !user,
    })
    const [addFavorite] = useAddFavoriteMutation()
    const [removeFavorite] = useRemoveFavoriteMutation()
    const [syncFavorites] = useSyncFavoritesMutation()

    useEffect(() => {
        const handleFavoritesChange = () => setLocalFavorites(readFavorites())

        window.addEventListener('storage', handleFavoritesChange)
        window.addEventListener('autocare-hub:favorites-change', handleFavoritesChange)

        return () => {
            window.removeEventListener('storage', handleFavoritesChange)
            window.removeEventListener('autocare-hub:favorites-change', handleFavoritesChange)
        }
    }, [])

    useEffect(() => {
        if (!user || isRemoteLoading || localFavorites.length === 0) return

        const existingRequest = migrationRequests.get(user.id)
        if (existingRequest) return

        const migrationFingerprint = localFavorites
            .map((favorite) => favorite.id)
            .sort()
            .join('|')
        if (migrationAttempts.get(user.id) === migrationFingerprint) return
        migrationAttempts.set(user.id, migrationFingerprint)

        const request = syncFavorites({
            cabinetIds: localFavorites.map((favorite) => favorite.id),
        })
            .unwrap()
            .then((response) => {
                const syncedIds = response.map((cabinet) => cabinet.id)
                const remainingFavorites = removeSyncedFavorites(readFavorites(), syncedIds)

                setLocalFavorites(remainingFavorites)
                writeFavorites(remainingFavorites)
            })
            .catch(() => undefined)
            .finally(() => {
                migrationRequests.delete(user.id)
            })

        migrationRequests.set(user.id, request)
    }, [isRemoteLoading, localFavorites, syncFavorites, user])

    const localById = useMemo(
        () => new Map(localFavorites.map((favorite) => [favorite.id, favorite])),
        [localFavorites],
    )
    const remoteFavorites = useMemo(
        () => (remoteCabinets ?? []).map((cabinet) => mapCabinetToFavorite(
            cabinet,
            t('cabinet.publicList.perHourShort'),
        )),
        [remoteCabinets, t],
    )
    const favorites = useMemo(
        () => mergeFavoriteCabinets(localFavorites, remoteFavorites),
        [localFavorites, remoteFavorites],
    )
    const favoriteIds = useMemo(
        () => new Set(favorites.map((favorite) => favorite.id)),
        [favorites],
    )
    const updateLocalFavorites = useCallback((favorite: FavoriteCabinet) => {
        const nextFavorites = toggleLocalFavorite(readFavorites(), favorite)

        writeFavorites(nextFavorites)
        setLocalFavorites(nextFavorites)
    }, [])

    const toggleFavorite = useCallback((favorite: FavoriteCabinet) => {
        const isAlreadyFavorite = favoriteIds.has(favorite.id)
        const isLocalFavorite = localById.has(favorite.id)
        const nextIsFavorite = !isAlreadyFavorite

        if (!user) {
            updateLocalFavorites(favorite)
            return nextIsFavorite
        }

        if (nextIsFavorite) {
            void addFavorite(favorite.id)
                .unwrap()
                .catch(() => updateLocalFavorites(favorite))
        } else {
            void removeFavorite(favorite.id)
                .unwrap()
                .then(() => {
                    if (isLocalFavorite) updateLocalFavorites(favorite)
                })
                .catch(() => updateLocalFavorites(favorite))
        }

        return nextIsFavorite
    }, [addFavorite, favoriteIds, localById, removeFavorite, updateLocalFavorites, user])

    const toggleCabinetFavorite = useCallback((cabinet: Cabinet) => {
        return toggleFavorite(mapCabinetToFavorite(
            cabinet,
            t('cabinet.publicList.perHourShort'),
        ))
    }, [t, toggleFavorite])

    return {
        favorites,
        isFavorite: (id: string) => favoriteIds.has(id),
        toggleFavorite,
        toggleCabinetFavorite,
        isLoading: Boolean(user && isRemoteLoading),
    }
}
