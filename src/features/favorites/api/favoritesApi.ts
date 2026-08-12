import type { Cabinet } from '@/entities/cabinet'
import { baseApi } from '@/shared/api/baseApi'
import {
    normalizeFavoriteResponse,
    normalizeFavoriteSuccessResponse,
    normalizeFavoritesResponse,
} from '../lib/favorites-response-schema'

type SyncFavoritesRequest = {
    cabinetIds: string[]
}

export const favoritesApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getFavorites: build.query<Cabinet[], void>({
            query: () => '/users/me/favorites',
            transformResponse: normalizeFavoritesResponse,
            providesTags: (result) => [
                { type: 'Favorites' as const, id: 'LIST' },
                ...(result ?? []).map((cabinet) => ({
                    type: 'Favorites' as const,
                    id: cabinet.id,
                })),
            ],
        }),

        addFavorite: build.mutation<Cabinet, string>({
            query: (cabinetId) => ({
                url: `/users/me/favorites/${cabinetId}`,
                method: 'POST',
            }),
            transformResponse: normalizeFavoriteResponse,
            invalidatesTags: (_result, _error, cabinetId) => [
                { type: 'Favorites', id: 'LIST' },
                { type: 'Favorites', id: cabinetId },
            ],
        }),

        removeFavorite: build.mutation<{ success: true }, string>({
            query: (cabinetId) => ({
                url: `/users/me/favorites/${cabinetId}`,
                method: 'DELETE',
            }),
            transformResponse: normalizeFavoriteSuccessResponse,
            invalidatesTags: (_result, _error, cabinetId) => [
                { type: 'Favorites', id: 'LIST' },
                { type: 'Favorites', id: cabinetId },
            ],
        }),

        syncFavorites: build.mutation<Cabinet[], SyncFavoritesRequest>({
            query: (body) => ({
                url: '/users/me/favorites/sync',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeFavoritesResponse,
            invalidatesTags: [{ type: 'Favorites', id: 'LIST' }],
        }),
    }),
})

export const {
    useGetFavoritesQuery,
    useAddFavoriteMutation,
    useRemoveFavoriteMutation,
    useSyncFavoritesMutation,
} = favoritesApi
