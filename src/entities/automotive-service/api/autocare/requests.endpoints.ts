import { updatedCountSchema } from './common.schemas'
import { autoCareAvailabilitySchema, autoCareRepairEventsSchema, autoCareRescheduleSchema, autoCareServiceAttachmentSchema, autoCareServiceConversationSchema, autoCareServiceMessageSchema, autoCareServiceRequestSchema, autoCareServiceRequestsSchema } from './requests.schemas'
import type { AutoCareAvailability, AutoCareQuoteDecisionInput, AutoCareRepairEvent, AutoCareReschedule, AutoCareServiceAttachment, AutoCareServiceConversation, AutoCareServiceMessage, AutoCareServiceRequest, CompleteAutoCareServiceRequestInput, CreateAutoCareServiceAttachmentInput, CreateAutoCareServiceMessageInput, CreateAutoCareServiceOfferInput, CreateAutoCareServiceQuoteInput, CreateAutoCareServiceRequestInput, DecideAutoCareServiceOfferInput, GetAutoCareAttachmentObjectUrlInput, GetAutoCareServiceConversationInput } from './requests.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createRequestsEndpoints(build: AutoCareEndpointBuilder) {
    return {
getAutoCareAvailability: build.query<AutoCareAvailability, { providerId: string; locationId: string; offeringId: string; date: string }>({
            query: ({ providerId, ...params }) => ({ url: `/v1/providers/${encodeURIComponent(providerId)}/availability`, params }),
            transformResponse: (value: unknown) => autoCareAvailabilitySchema.parse(value),
        }),
createAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, CreateAutoCareServiceRequestInput>({
            query: ({ idempotencyKey, ...body }) => ({
                url: '/v1/service-requests',
                method: 'POST',
                headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
                body,
            }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
getMyAutoCareServiceRequests: build.query<AutoCareServiceRequest[], void>({
            query: () => '/v1/service-requests/my',
            transformResponse: (value: unknown) => autoCareServiceRequestsSchema.parse(value),
            providesTags: (result) => result
                ? [...result.map((item) => ({ type: 'AutoCareServiceRequest' as const, id: item.id })), { type: 'AutoCareServiceRequest' as const, id: 'LIST' }]
                : [{ type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
getAutoCareServiceRequest: build.query<AutoCareServiceRequest, string>({
            query: (requestId) => `/v1/service-requests/${requestId}`,
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
getAutoCareRepairTimeline: build.query<AutoCareRepairEvent[], string>({
            query: (requestId) => `/v1/service-requests/${requestId}/timeline`,
            transformResponse: (value: unknown) => autoCareRepairEventsSchema.parse(value),
            providesTags: (_result, _error, requestId) => [{ type: 'AutoCareMarketplace', id: `TIMELINE_${requestId}` }],
        }),
getAutoCareServiceConversation: build.query<AutoCareServiceConversation, string | GetAutoCareServiceConversationInput>({
            query: (input) => {
                const { requestId, cursor, beforeCursor, limit } = typeof input === 'string' ? { requestId: input, cursor: undefined, beforeCursor: undefined, limit: undefined } : input
                return { url: `/v1/service-requests/${requestId}/conversation`, params: { cursor, beforeCursor, limit } }
            },
            transformResponse: (value: unknown) => autoCareServiceConversationSchema.parse(value),
            providesTags: (_result, _error, input) => [{ type: 'AutoCareServiceRequest', id: typeof input === 'string' ? input : input.requestId }],
        }),
createAutoCareServiceMessage: build.mutation<AutoCareServiceMessage, CreateAutoCareServiceMessageInput>({
            query: ({ requestId, body, idempotencyKey }) => ({ url: `/v1/service-requests/${requestId}/messages`, method: 'POST', headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined, body: { body } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
createAutoCareServiceOffer: build.mutation<AutoCareServiceMessage, CreateAutoCareServiceOfferInput>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/offers`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
decideAutoCareServiceOffer: build.mutation<AutoCareServiceMessage, DecideAutoCareServiceOfferInput>({
            query: ({ requestId, messageId, decision }) => ({ url: `/v1/service-requests/${requestId}/offers/${messageId}/decision`, method: 'POST', body: { decision } }),
            transformResponse: (value: unknown) => autoCareServiceMessageSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
markAutoCareServiceConversationRead: build.mutation<{ updated: number }, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/read`, method: 'POST' }),
            transformResponse: (value: unknown) => updatedCountSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
createAutoCareServiceAttachment: build.mutation<AutoCareServiceAttachment, CreateAutoCareServiceAttachmentInput>({
            query: ({ requestId, ...body }) => ({ url: `/v1/service-requests/${requestId}/attachments`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceAttachmentSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }],
        }),
getAutoCareAttachmentObjectUrl: build.query<string, GetAutoCareAttachmentObjectUrlInput>({
            query: (input) => {
                const path = input.channel === 'request'
                    ? `/v1/service-requests/${encodeURIComponent(input.requestId)}/attachments/${encodeURIComponent(input.attachmentId)}`
                    : `/v1/chats/${encodeURIComponent(input.chatId)}/attachments/${encodeURIComponent(input.attachmentId)}`
                const query = input.channel === 'chat' && input.emergencyReason
                    ? `?${new URLSearchParams({ emergencyReason: input.emergencyReason })}`
                    : ''
                return {
                url: `${path}${query}`,
                // The endpoint authorizes with the in-memory bearer token and may redirect to a signed object URL.
                // Omit cookies so the cross-origin storage response only needs ordinary origin-scoped CORS.
                credentials: 'omit',
                responseHandler: (response) => response.blob(),
                }
            },
            transformResponse: (blob: Blob) => URL.createObjectURL(blob),
            keepUnusedDataFor: 0,
            async onCacheEntryAdded(_arg, { cacheDataLoaded, cacheEntryRemoved }) {
                try {
                    const { data: objectUrl } = await cacheDataLoaded
                    await cacheEntryRemoved
                    URL.revokeObjectURL(objectUrl)
                } catch {
                    // The request may fail before a cache entry is created.
                }
            },
        }),
confirmAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/v1/service-requests/${requestId}/confirm`, method: 'POST' }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
cancelAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, { requestId: string; reason?: string | null }>({
            query: ({ requestId, reason }) => ({ url: `/v1/service-requests/${requestId}/cancel`, method: 'POST', body: { reason: reason ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }, { type: 'AutoCareMarketplace', id: 'BONUSES_MY' }],
        }),
decideAutoCareServiceReschedule: build.mutation<AutoCareServiceRequest, { requestId: string; rescheduleId: string; decision: 'accept' | 'reject'; reason?: string | null }>({
            query: ({ requestId, rescheduleId, decision, reason }) => ({ url: `/v1/service-requests/${requestId}/reschedule/decision`, method: 'POST', body: { rescheduleId, decision, reason: reason ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
acceptAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, AutoCareQuoteDecisionInput>({
            query: ({ requestId, quoteId, quoteVersion }) => ({ url: `/v1/service-requests/${requestId}/quote/accept`, method: 'POST', body: { quoteId, quoteVersion } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
declineAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, AutoCareQuoteDecisionInput>({
            query: ({ requestId, quoteId, quoteVersion }) => ({ url: `/v1/service-requests/${requestId}/quote/decline`, method: 'POST', body: { quoteId, quoteVersion } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
getOwnerAutoCareServiceRequests: build.query<AutoCareServiceRequest[], void>({
            query: () => '/owner/service-requests',
            transformResponse: (value: unknown) => autoCareServiceRequestsSchema.parse(value),
            providesTags: (result) => result
                ? [...result.map((item) => ({ type: 'AutoCareServiceRequest' as const, id: item.id })), { type: 'AutoCareServiceRequest' as const, id: 'OWNER_LIST' }]
                : [{ type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
confirmOwnerAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, string>({
            query: (requestId) => ({ url: `/owner/service-requests/${requestId}/confirm`, method: 'POST' }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, requestId) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
createAutoCareServiceQuote: build.mutation<AutoCareServiceRequest, CreateAutoCareServiceQuoteInput>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/quote`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
requestAutoCareServiceReschedule: build.mutation<AutoCareReschedule, { requestId: string; proposedAt: string; reason?: string | null }>({
            query: ({ requestId, ...body }) => ({ url: `/owner/service-requests/${requestId}/reschedule`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareRescheduleSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
markAutoCareServiceRequestNoShow: build.mutation<AutoCareServiceRequest, { requestId: string; reason?: string | null }>({
            query: ({ requestId, reason }) => ({ url: `/owner/service-requests/${requestId}/no-show`, method: 'POST', body: { reason: reason ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        }),
completeAutoCareServiceRequest: build.mutation<AutoCareServiceRequest, CompleteAutoCareServiceRequestInput>({
            query: ({ requestId, note }) => ({ url: `/owner/service-requests/${requestId}/complete`, method: 'POST', body: { note: note ?? null } }),
            transformResponse: (value: unknown) => autoCareServiceRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'OWNER_LIST' }],
        })
    }
}
