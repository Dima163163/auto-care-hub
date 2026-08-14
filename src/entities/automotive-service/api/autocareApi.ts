import { baseApi } from '@/shared/api/baseApi'
import { z } from 'zod'

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
    description?: string | null
    priceFromMinor: number
    priceToMinor: number | null
    currencyCode: string
    durationMinutes: number
    inclusions: string[]
    warrantyText: string | null
    active: boolean
    priceType?: 'fixed' | 'from' | 'range' | 'quote_required'
}

export type UpdateAutoCareOfferInput = {
    providerId: string
    offerId: string
    description: string | null
    priceFromMinor: number
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
    logoUrl: string | null
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
    offers?: AutoCareApiOffer[]
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

export type AdminAutoCareProvider = AutoCareApiProvider & {
    ownerName: string | null
    trustScore: number
}

export type SuperAdminPlatformOverview = {
    markets: Array<{ id: string; countryCode: string; countryName: string; cityCode: string; cityName: string; currencyCode: string; launchReady: boolean; supportedLocales: string[] }>
    providers: { total: number; active: number; draft: number; suspended: number; verified: number }
    users: { clients: number; owners: number; admins: number; superAdmins: number }
    billing: { phase: 'launch'; subscriptionsEnabled: boolean; promoCodesEnabled: boolean }
}

export type AutoCareApiReview = {
    id: string
    providerId: string
    authorName: string
    vehicleLabel: string
    rating: number
    text: string
    avatarUrl: string | null
    photoUrls: string[]
    createdAt: string
    serviceRequestId?: string | null
    serviceSlug?: string | null
    revisionAllowedUntil?: string | null
    revisionUsedAt?: string | null
    canContact?: boolean
    canEdit?: boolean
    providerName?: string
    providerAddress?: string
}

export type AutoCareReviewPromo = {
    id: string
    reviewId: string
    providerId: string
    serviceRequestId: string | null
    serviceSlug: string | null
    code: string
    discountPercent: number
    status: 'active' | 'redeemed' | 'revoked' | 'expired'
    expiresAt: string
    redeemedAt: string | null
}

export type IssueAutoCareReviewPromoInput = {
    providerId: string
    reviewId: string
    discountPercent: number
    serviceSlug?: string | null
    expiresInDays?: number
}

export type RedeemAutoCareReviewPromoInput = { code: string }
export type UpdateAutoCareReviewInput = { reviewId: string; rating: number; text: string }

export type AutoCareApiProviderReviews = {
    providerId: string
    totalReviews: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
    reviews: AutoCareApiReview[]
}

export type OwnerAutoCareReviewsProvider = { id: string; name: string; address: string; rating: number; reviewCount: number }
export type OwnerAutoCareReviews = { selectedProviderId: string | null; providers: OwnerAutoCareReviewsProvider[]; totalReviews: number; averageRating: number; distribution: Record<'1' | '2' | '3' | '4' | '5', number>; reviews: AutoCareApiReview[] }

export type AutoCareVehicleEngine = {
    id: string
    fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'hydrogen' | 'other'
    displacementL: number | null
    horsepower: number | null
}

export type AutoCareVehicleModel = {
    id: string
    label: string
    yearsFrom: number
    yearsTo: number
    engines: AutoCareVehicleEngine[]
}

export type AutoCareVehicleBrand = {
    id: string
    labels: Record<string, string>
    models: AutoCareVehicleModel[]
}

const featuredReviewSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    authorName: z.string(),
    vehicleLabel: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
    avatarUrl: z.string().nullable(),
    photoUrls: z.array(z.string().min(1)),
    createdAt: z.string().datetime({ offset: true }),
    serviceRequestId: z.string().nullable().optional(),
    serviceSlug: z.string().nullable().optional(),
    revisionAllowedUntil: z.string().datetime({ offset: true }).nullable().optional(),
    revisionUsedAt: z.string().datetime({ offset: true }).nullable().optional(),
    canContact: z.boolean().optional(),
    canEdit: z.boolean().optional(),
}) satisfies z.ZodType<AutoCareApiReview>

const reviewPromoSchema = z.object({
    id: z.string(),
    reviewId: z.string(),
    providerId: z.string(),
    serviceRequestId: z.string().nullable(),
    serviceSlug: z.string().nullable(),
    code: z.string(),
    discountPercent: z.number().int().min(1).max(100),
    status: z.enum(['active', 'redeemed', 'revoked', 'expired']),
    expiresAt: z.string().datetime({ offset: true }),
    redeemedAt: z.string().datetime({ offset: true }).nullable(),
}) satisfies z.ZodType<AutoCareReviewPromo>

const ownerProviderReviewsSchema = z.object({
    providerId: z.string(),
    totalReviews: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    distribution: z.object({
        '1': z.number().int().nonnegative(),
        '2': z.number().int().nonnegative(),
        '3': z.number().int().nonnegative(),
        '4': z.number().int().nonnegative(),
        '5': z.number().int().nonnegative(),
    }),
    reviews: z.array(featuredReviewSchema),
}) satisfies z.ZodType<AutoCareApiProviderReviews>

const ownerAutoCareReviewsSchema = z.object({
    selectedProviderId: z.string().nullable(),
    providers: z.array(z.object({ id: z.string(), name: z.string(), address: z.string(), rating: z.number().min(0).max(5), reviewCount: z.number().int().nonnegative() })),
    totalReviews: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    distribution: ownerProviderReviewsSchema.shape.distribution,
    reviews: z.array(featuredReviewSchema.extend({ providerName: z.string(), providerAddress: z.string() })),
}) satisfies z.ZodType<OwnerAutoCareReviews>

export type AutoCareAvailability = { date: string; durationMinutes: number; slots: Array<{ startTime: string; endTime: string }> }

export type AutoCareServiceRequest = {
    id: string
    providerId: string
    providerName: string
    locationId: string
    address: string
    definitionId: string
    serviceSlug: string
    serviceLabels: Record<string, string>
    serviceDescription: string | null
    offeringId: string | null
    priceFromMinor: number | null
    currencyCode: string | null
    preferredAt: string | null
    vehicleSnapshot: Record<string, string | number | null> | null
    contactSnapshot: Record<string, string | number | null> | null
    note: string | null
    status: 'draft' | 'open' | 'awaiting_reply' | 'estimate_shared' | 'accepted' | 'declined' | 'closed'
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    createdAt: string
    updatedAt: string
    quote: AutoCareServiceQuote | null
}

export type AutoCareServiceQuote = { amountMinor: number; currencyCode: string; note: string | null; createdAt: string }
export type AutoCareServiceMessageOffer = { type: 'discount' | 'alternative'; title: string; description: string | null; discountPercent: number | null; couponCode: string | null; amountMinor: number | null; currencyCode: string | null; expiresAt: string | null; status: 'pending' | 'accepted' | 'declined' }
export type AutoCareServiceMessage = { id: string; senderId: string; kind: 'text' | 'system' | 'offer'; body: string | null; offer: AutoCareServiceMessageOffer | null; deliveredAt: string | null; readAt: string | null; createdAt: string }
export type AutoCareServiceAttachment = { id: string; uploadedById: string; contentType: string; bytes: number; status: 'pending' | 'ready' | 'rejected'; url: string; createdAt: string }
export type AutoCareServiceConversation = { request: AutoCareServiceRequest; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[] }
export type AutoCareChatThreadType = 'service_request' | 'provider_inquiry' | 'support' | 'admin_escalation'
export type AutoCareChatThread = { id: string; type: AutoCareChatThreadType; status: 'open' | 'closed'; subject: string; requestId: string | null; providerId: string | null; providerName: string | null; clientId: string | null; lastMessageAt: string | null; unreadCount: number; createdAt: string; updatedAt: string }
export type AutoCareChatConversation = { thread: AutoCareChatThread; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[] }
export type CreateAutoCareChatInput = { type: Exclude<AutoCareChatThreadType, 'service_request'>; providerId?: string; requestId?: string; subject: string }
export type CreateAutoCareChatMessageInput = { chatId: string; body: string }
export type CreateAutoCareChatAttachmentInput = { chatId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }
export type CreateAutoCareServiceMessageInput = { requestId: string; body: string }
export type CreateAutoCareServiceOfferInput = { requestId: string; type: 'discount' | 'alternative'; title: string; description?: string | null; discountPercent?: number | null; couponCode?: string | null; amountMinor?: number | null; currencyCode?: string | null; expiresAt?: string | null }
export type DecideAutoCareServiceOfferInput = { requestId: string; messageId: string; decision: 'accept' | 'decline' }
export type CreateAutoCareServiceAttachmentInput = { requestId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }
export type CreateAutoCareServiceQuoteInput = { requestId: string; amountMinor: number; currencyCode: string; note?: string | null }

export type CreateAutoCareServiceRequestInput = {
    providerId: string
    locationId: string
    offeringId: string
    preferredAt: string
    vehicleSnapshot?: {
        make: string
        model: string
        year: number
        mileage?: number
    } | null
    contactSnapshot: {
        name: string
        email: string
        phone: string
    }
    note?: string | null
    idempotencyKey?: string
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
    logoUrl?: string | null
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
        getVehicleCatalog: build.query<AutoCareVehicleBrand[], string | void>({
            query: (brandId) => ({ url: '/v1/vehicle-catalog', params: brandId ? { brandId } : undefined }),
            providesTags: [{ type: 'AutoCareVehicleCatalog', id: 'LIST' }],
        }),
        getFeaturedAutoCareReviews: build.query<AutoCareApiReview[], number | void>({
            query: (limit = 6) => ({ url: '/v1/reviews/featured', params: { limit } }),
            transformResponse: (value: unknown) => z.array(featuredReviewSchema).parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'FEATURED' }],
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
        getAutoCareAvailability: build.query<AutoCareAvailability, { providerId: string; locationId: string; offeringId: string; date: string }>({
            query: ({ providerId, ...params }) => ({ url: `/v1/providers/${providerId}/availability`, params }),
        }),
        getOwnerAutoCareProviders: build.query<AutoCareApiProvider[], void>({
            query: () => '/owner/autocare-providers',
            providesTags: [{ type: 'AutoCareProvider', id: 'OWNER_LIST' }],
        }),
        updateOwnerAutoCareOffer: build.mutation<AutoCareApiOffer, UpdateAutoCareOfferInput>({
            query: ({ providerId, offerId, ...body }) => ({ url: `/owner/autocare-providers/${providerId}/offers/${offerId}`, method: 'PATCH', body }),
            invalidatesTags: (_result, _error, { providerId }) => [
                { type: 'AutoCareProvider', id: providerId },
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'LIST' },
            ],
        }),
        getOwnerAutoCareProviderReviews: build.query<AutoCareApiProviderReviews, string>({
            query: (providerId) => `/owner/autocare-providers/${providerId}/reviews`,
            transformResponse: (value: unknown) => ownerProviderReviewsSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareReview', id: `OWNER_${providerId}` }],
        }),
        getOwnerAutoCareReviews: build.query<OwnerAutoCareReviews, string | void>({
            query: (providerId) => ({ url: '/owner/autocare-reviews', params: providerId ? { providerId } : undefined }),
            transformResponse: (value: unknown) => ownerAutoCareReviewsSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'OWNER_ALL' }],
        }),
        issueOwnerAutoCareReviewPromo: build.mutation<AutoCareReviewPromo, IssueAutoCareReviewPromoInput>({
            query: ({ providerId, reviewId, ...body }) => ({ url: `/owner/autocare-providers/${providerId}/reviews/${reviewId}/promos`, method: 'POST', body }),
            transformResponse: (value: unknown) => reviewPromoSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareReview', id: `OWNER_${providerId}` }],
        }),
        getMyAutoCareReviews: build.query<AutoCareApiReview[], void>({
            query: () => '/v1/autocare-reviews/my',
            transformResponse: (value: unknown) => z.array(featuredReviewSchema).parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }],
        }),
        redeemAutoCareReviewPromo: build.mutation<AutoCareReviewPromo, RedeemAutoCareReviewPromoInput>({
            query: (body) => ({ url: '/v1/autocare-review-promos/redeem', method: 'POST', body }),
            transformResponse: (value: unknown) => reviewPromoSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }],
        }),
        updateAutoCareReview: build.mutation<AutoCareApiReview, UpdateAutoCareReviewInput>({
            query: ({ reviewId, ...body }) => ({ url: `/v1/autocare-reviews/${reviewId}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => featuredReviewSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'CLIENT_LIST' }, { type: 'AutoCareReview', id: 'FEATURED' }],
        }),
        getAdminAutoCareProviders: build.query<AdminAutoCareProvider[], void>({
            query: () => '/admin/autocare-providers',
            providesTags: [{ type: 'AutoCareProvider', id: 'ADMIN_LIST' }],
        }),
        updateAdminAutoCareProviderStatus: build.mutation<AdminAutoCareProvider, { id: string; status: AutoCareApiProvider['status'] }>({
            query: ({ id, status }) => ({ url: `/admin/autocare-providers/${id}/status`, method: 'PATCH', body: { status } }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'AutoCareProvider', id }, { type: 'AutoCareProvider', id: 'ADMIN_LIST' }],
        }),
        getSuperAdminPlatformOverview: build.query<SuperAdminPlatformOverview, void>({
            query: () => '/super-admin/platform-overview',
            providesTags: [{ type: 'AutoCareProvider', id: 'PLATFORM_OVERVIEW' }],
        }),
        uploadOwnerAutoCareProviderLogo: build.mutation<{ url: string }, { fileName: string; mimeType: string; size: number; contentBase64: string }>({
            query: (body) => ({ url: '/owner/autocare-providers/logo', method: 'POST', body }),
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
        createAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, CreateAutoCareServiceRequestInput>({
            query: ({ idempotencyKey, ...body }) => ({
                url: '/v1/service-requests',
                method: 'POST',
                headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
                body,
            }),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        getMyAutoCareServiceRequests: build.query<AutoCareServiceRequest[], void>({
            query: () => '/v1/service-requests/my',
            providesTags: (result) => result
                ? [...result.map((item) => ({ type: 'AutoCareServiceRequest' as const, id: item.id })), { type: 'AutoCareServiceRequest' as const, id: 'LIST' }]
                : [{ type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        getAutoCareChats: build.query<AutoCareChatThread[], void>({
            query: () => '/v1/chats',
            providesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        createAutoCareChat: build.mutation<AutoCareChatThread, CreateAutoCareChatInput>({
            query: (body) => ({ url: '/v1/chats', method: 'POST', body }),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        getAutoCareChat: build.query<AutoCareChatConversation, string>({
            query: (chatId) => `/v1/chats/${chatId}`,
            providesTags: (_result, _error, chatId) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
        createAutoCareChatMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareChatMessageInput>({
            query: ({ chatId, body }) => ({ url: `/v1/chats/${chatId}/messages`, method: 'POST', body: { body } }),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        markAutoCareChatRead: build.mutation<{ updated: number }, string>({
            query: (chatId) => ({ url: `/v1/chats/${chatId}/read`, method: 'POST' }),
            invalidatesTags: (_result, _error, chatId) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }, { type: 'AutoCareServiceRequest', id: 'CHAT_LIST' }],
        }),
        createAutoCareChatAttachment: build.mutation<AutoCareServiceAttachment, CreateAutoCareChatAttachmentInput>({
            query: ({ chatId, ...body }) => ({ url: `/v1/chats/${chatId}/attachments`, method: 'POST', body }),
            invalidatesTags: (_result, _error, { chatId }) => [{ type: 'AutoCareServiceRequest', id: `CHAT_${chatId}` }],
        }),
        getAutoCareServiceRequest: build.query<AutoCareServiceRequest, string>({
            query: (requestId) => `/v1/service-requests/${requestId}`,
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        getAutoCareServiceConversation: build.query<AutoCareServiceConversation, string>({
            query: (requestId) => `/v1/service-requests/${requestId}/conversation`,
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        createAutoCareServiceMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareServiceMessageInput>({
            query: ({ requestId, body }) => ({ url: `/v1/service-requests/${requestId}/messages`, method: 'POST', body: { body } }),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        createAutoCareServiceOffer: build.mutation<AutoCareServiceMessage, CreateAutoCareServiceOfferInput>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/offers`, method: 'POST', body }),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        decideAutoCareServiceOffer: build.mutation<AutoCareServiceMessage, DecideAutoCareServiceOfferInput>({
            query: ({ requestId, messageId, decision }) => ({ url: `/v1/service-requests/${requestId}/offers/${messageId}/decision`, method: 'POST', body: { decision } }),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        markAutoCareServiceConversationRead: build.mutation<{ updated: number }, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/read`, method: 'POST' }),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        createAutoCareServiceAttachment: build.mutation<AutoCareServiceAttachment, CreateAutoCareServiceAttachmentInput>({
            query: ({ requestId, ...body }) => ({ url: `/v1/service-requests/${requestId}/attachments`, method: 'POST', body }),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
        confirmAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/confirm`, method: 'POST' }),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        acceptAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/quote/accept`, method: 'POST' }),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        declineAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/quote/decline`, method: 'POST' }),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
        getOwnerAutoCareServiceRequests: build.query<AutoCareServiceRequest[], void>({
            query: () => '/owner/service-requests',
            providesTags: (result) => result
                ? [...result.map((item) => ({ type: 'AutoCareServiceRequest' as const, id: item.id })), { type: 'AutoCareServiceRequest' as const, id: 'OWNER_LIST' }]
                : [{ type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        confirmOwnerAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/owner/service-requests/${requestId}/confirm`, method: 'POST' }),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
        createAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, CreateAutoCareServiceQuoteInput>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/quote`, method: 'POST', body }),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
    }),
})

export const {
    useGetAutoCareDiscoveryQuery,
    useGetAutoCareMarketsQuery,
    useGetOwnerAutoCareProvidersQuery,
    useUpdateOwnerAutoCareOfferMutation,
    useGetOwnerAutoCareProviderReviewsQuery,
    useGetOwnerAutoCareReviewsQuery,
    useIssueOwnerAutoCareReviewPromoMutation,
    useGetMyAutoCareReviewsQuery,
    useRedeemAutoCareReviewPromoMutation,
    useUpdateAutoCareReviewMutation,
    useGetAdminAutoCareProvidersQuery,
    useUpdateAdminAutoCareProviderStatusMutation,
    useGetSuperAdminPlatformOverviewQuery,
    useUploadOwnerAutoCareProviderLogoMutation,
    useGetAutoCareProviderProfileQuery,
    useGetAutoCareAvailabilityQuery,
    useGetAutoCareServiceDefinitionsQuery,
    useGetVehicleCatalogQuery,
    useGetFeaturedAutoCareReviewsQuery,
    useCreateOwnerAutoCareProviderMutation,
    useCreateAutoCareServiceRequestMutation,
    useGetMyAutoCareServiceRequestsQuery,
    useGetAutoCareChatsQuery,
    useCreateAutoCareChatMutation,
    useGetAutoCareChatQuery,
    useCreateAutoCareChatMessageMutation,
    useMarkAutoCareChatReadMutation,
    useCreateAutoCareChatAttachmentMutation,
    useGetAutoCareServiceRequestQuery,
    useGetAutoCareServiceConversationQuery,
    useCreateAutoCareServiceMessageMutation,
    useCreateAutoCareServiceOfferMutation,
    useDecideAutoCareServiceOfferMutation,
    useMarkAutoCareServiceConversationReadMutation,
    useCreateAutoCareServiceAttachmentMutation,
    useConfirmAutoCareServiceRequestMutation,
    useAcceptAutoCareServiceQuoteMutation,
    useDeclineAutoCareServiceQuoteMutation,
    useGetOwnerAutoCareServiceRequestsQuery,
    useConfirmOwnerAutoCareServiceRequestMutation,
    useCreateAutoCareServiceQuoteMutation,
} = autoCareApi
