import { z } from 'zod'
import { autoCareDiscoverySchema, autoCareFavoriteSchema, autoCareFavoritesSchema, autoCareOfferSchema, autoCareProviderAnalyticsSchema, autoCareProviderProfileSchema, autoCareProviderSchema, ownerAutoCareEvidenceListSchema, uploadResponseSchema } from './providers.schemas'
import type { AutoCareApiDiscoveryResponse, AutoCareApiOffer, AutoCareApiProvider, AutoCareApiProviderProfile, AutoCareDiscoveryQuery, AutoCareFavorite, AutoCareProviderAnalytics, CreateOwnerAutoCareProviderInput, OwnerAutoCareEvidence, UpdateAutoCareCommunicationSettingsInput, UpdateAutoCareOfferInput, UploadOwnerAutoCareProviderMediaInput } from './providers.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createProvidersEndpoints(build: AutoCareEndpointBuilder) {
    return {
getAutoCareDiscovery: build.query<AutoCareApiDiscoveryResponse, AutoCareDiscoveryQuery | void>({
            query: (params) => ({ url: '/v1/discovery/providers', params: params ?? undefined }),
            transformResponse: (value: unknown) => autoCareDiscoverySchema.parse(value),
            providesTags: (result) => result
                ? [
                    ...result.items.map((item) => ({ type: 'AutoCareProvider' as const, id: item.provider.id })),
                    { type: 'AutoCareProvider' as const, id: 'LIST' },
                ]
                : [{ type: 'AutoCareProvider' as const, id: 'LIST' }],
        }),
getAutoCareProviderProfile: build.query<AutoCareApiProviderProfile, string>({
            query: (providerId) => `/v1/providers/${encodeURIComponent(providerId)}`,
            transformResponse: (value: unknown) => autoCareProviderProfileSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: providerId }],
        }),
getAutoCareFavorites: build.query<AutoCareFavorite[], void>({
            query: () => '/v1/favorites/providers',
            transformResponse: (value: unknown) => autoCareFavoritesSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
addAutoCareFavorite: build.mutation<AutoCareFavorite, { providerId: string; locationId?: string }>({
            query: ({ providerId, ...body }) => ({ url: `/v1/favorites/providers/${encodeURIComponent(providerId)}`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFavoriteSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
removeAutoCareFavorite: build.mutation<{ success: true }, string>({
            query: (providerId) => ({ url: `/v1/favorites/providers/${encodeURIComponent(providerId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => z.object({ success: z.literal(true) }).parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
syncAutoCareFavorites: build.mutation<AutoCareFavorite[], { providerIds: string[] }>({
            query: (body) => ({ url: '/v1/favorites/providers/sync', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFavoritesSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FAVORITES' }],
        }),
getOwnerAutoCareProviders: build.query<AutoCareApiProvider[], void>({
            query: () => '/owner/autocare-providers',
            transformResponse: (value: unknown) => z.array(autoCareProviderSchema).parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'OWNER_LIST' }],
        }),
updateOwnerAutoCareCommunicationSettings: build.mutation<AutoCareApiProvider, UpdateAutoCareCommunicationSettingsInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/communication-settings`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareProviderSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: providerId }, { type: 'AutoCareProvider', id: 'OWNER_LIST' }],
        }),
getOwnerAutoCareProviderAnalytics: build.query<AutoCareProviderAnalytics, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/analytics`,
            transformResponse: (value: unknown) => autoCareProviderAnalyticsSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `ANALYTICS_${providerId}` }],
        }),
getOwnerAutoCareProviderEvidence: build.query<OwnerAutoCareEvidence[], string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/evidence`,
            transformResponse: (value: unknown) => ownerAutoCareEvidenceListSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `EVIDENCE_${providerId}` }],
        }),
updateOwnerAutoCareOffer: build.mutation<AutoCareApiOffer, UpdateAutoCareOfferInput>({
            query: ({ providerId, offerId, ...body }) => ({ url: `/owner/autocare-providers/${providerId}/offers/${offerId}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareOfferSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [
                { type: 'AutoCareProvider', id: providerId },
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'LIST' },
            ],
        }),
uploadOwnerAutoCareProviderLogo: build.mutation<{ url: string }, { fileName: string; mimeType: string; size: number; contentBase64: string }>({
            query: (body) => ({ url: '/owner/autocare-providers/logo', method: 'POST', body }),
            transformResponse: (value: unknown) => uploadResponseSchema.parse(value),
        }),
uploadOwnerAutoCareProviderMedia: build.mutation<{ url: string }, UploadOwnerAutoCareProviderMediaInput>({
            query: (body) => ({ url: '/owner/autocare-providers/media', method: 'POST', body }),
            transformResponse: (value: unknown) => uploadResponseSchema.parse(value),
        }),
createOwnerAutoCareProvider: build.mutation<AutoCareApiProvider, CreateOwnerAutoCareProviderInput>({
            query: (body) => ({
                url: '/owner/autocare-providers',
                method: 'POST',
                body,
            }),
            transformResponse: (value: unknown) => autoCareProviderSchema.parse(value),
            invalidatesTags: [
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'LIST' },
            ],
        })
    }
}
