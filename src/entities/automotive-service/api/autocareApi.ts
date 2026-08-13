import { baseApi } from '@/shared/api/baseApi'

export type AutoCareApiMarket = {
    id: string
    countryCode: string
    countryName: string
    cityCode: string
    cityName: string
    currencyCode: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    launchReady: boolean
}

export type AutoCareApiServiceDefinition = {
    id: string
    slug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    active: boolean
}

export type AutoCareApiOffer = {
    id: string
    serviceDefinitionId: string
    serviceSlug?: string
    serviceLabels?: Record<string, string>
    priceFromMinor: number
    priceToMinor: number | null
    currencyCode: string
    durationMinutes: number
    inclusions: string[]
    warrantyText: string | null
    active: boolean
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
}

export type AutoCareApiProvider = {
    id: string
    name: string
    description: string | null
    status: 'draft' | 'active' | 'suspended'
    verified: boolean
    yearsActive: number
    staffCount: number
    rating: number
    reviewCount: number
    bonusSummary: string | null
    coverImageUrl: string | null
    galleryImageUrls: string[]
    amenityIds: string[]
    brandSpecializations: string[]
    isMultibrand: boolean
    location: {
        id: string
        marketId: string
        address: string
        hours: string
        latitude: number | null
        longitude: number | null
    }
}

export type AutoCareApiDiscoveryItem = {
    provider: AutoCareApiProvider
    offer: AutoCareApiOffer
    distanceKm: number
    nextSlot: string | null
}

export type AutoCareApiDiscoveryResponse = {
    items: AutoCareApiDiscoveryItem[]
    nextCursor: string | null
}

export type AutoCareApiProviderProfile = AutoCareApiProvider & {
    offers: AutoCareApiOffer[]
}

export type CreateOwnerAutoCareProviderInput = {
    name: string
    description?: string
    marketId: string
    address: string
    hours: string
    yearsActive: number
    staffCount: number
    isMultibrand: boolean
    brandSpecializations: string[]
    amenityIds: string[]
}

export type AutoCareDiscoveryQuery = {
    serviceId?: string
    marketId?: string
    radiusKm?: number
    sort?: 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
    limit?: number
    minPrice?: number
    maxPrice?: number
    minRating?: number
    availableToday?: boolean
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
    verifiedOnly?: boolean
    warrantyOnly?: boolean
    hasBonus?: boolean
    inclusion?: string
    brandId?: string
}

export const autoCareApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getAutoCareMarkets: build.query<AutoCareApiMarket[], void>({
            query: () => '/v1/markets',
            providesTags: [{ type: 'AutoCareMarket', id: 'LIST' }],
        }),
        getAutoCareServiceDefinitions: build.query<AutoCareApiServiceDefinition[], void>({
            query: () => '/v1/service-definitions',
            providesTags: [{ type: 'AutoCareServiceDefinition', id: 'LIST' }],
        }),
        getAutoCareDiscovery: build.query<AutoCareApiDiscoveryResponse, AutoCareDiscoveryQuery | void>({
            query: (params) => ({ url: '/v1/discovery/providers', params: params ?? undefined }),
            providesTags: (result) => result
                ? [
                    ...result.items.map((item) => ({ type: 'AutoCareProvider' as const, id: item.provider.id })),
                    { type: 'AutoCareProvider' as const, id: 'LIST' },
                ]
                : [{ type: 'AutoCareProvider' as const, id: 'LIST' }],
        }),
        getAutoCareProviderProfile: build.query<AutoCareApiProviderProfile, string>({
            query: (providerId) => `/v1/providers/${providerId}`,
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: providerId }],
        }),
        getOwnerAutoCareProviders: build.query<AutoCareApiProvider[], void>({
            query: () => '/owner/autocare-providers',
            providesTags: [{ type: 'AutoCareProvider', id: 'OWNER_LIST' }],
        }),
        createOwnerAutoCareProvider: build.mutation<AutoCareApiProvider, CreateOwnerAutoCareProviderInput>({
            query: (body) => ({
                url: '/owner/autocare-providers',
                method: 'POST',
                body,
            }),
            invalidatesTags: [
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'LIST' },
            ],
        }),
    }),
})

export const {
    useGetAutoCareDiscoveryQuery,
    useGetAutoCareMarketsQuery,
    useGetOwnerAutoCareProvidersQuery,
    useGetAutoCareProviderProfileQuery,
    useGetAutoCareServiceDefinitionsQuery,
    useCreateOwnerAutoCareProviderMutation,
} = autoCareApi
