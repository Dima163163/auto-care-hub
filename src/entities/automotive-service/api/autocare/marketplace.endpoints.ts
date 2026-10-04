import { autoCareBroadcastOfferSchema, autoCareBroadcastSchema, autoCareBroadcastsSchema, autoCareExpertQuestionSchema, autoCareExpertQuestionsSchema, autoCareFleetSchema, autoCareFleetVehicleSchema, autoCareFleetsSchema, autoCareGuaranteeClaimSchema, autoCareGuaranteeClaimsSchema } from './marketplace.schemas'
import type { AutoCareBroadcastOffer, AutoCareBroadcastRequest, AutoCareExpertQuestion, AutoCareFleet, AutoCareFleetVehicle, AutoCareGuaranteeClaim, CreateAutoCareBroadcastOfferInput, CreateAutoCareBroadcastRequestInput, CreateAutoCareExpertQuestionInput, CreateAutoCareFleetInput, CreateAutoCareFleetVehicleInput, CreateAutoCareGuaranteeClaimInput } from './marketplace.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createMarketplaceEndpoints(build: AutoCareEndpointBuilder) {
    return {
createAutoCareBroadcastRequest: build.mutation<AutoCareBroadcastRequest, CreateAutoCareBroadcastRequestInput>({
            query: (body) => ({ url: '/v1/broadcast-requests', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareBroadcastSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'BROADCAST_LIST' }],
        }),
getMyAutoCareBroadcastRequests: build.query<AutoCareBroadcastRequest[], void>({
            query: () => '/v1/broadcast-requests/my',
            transformResponse: (value: unknown) => autoCareBroadcastsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'BROADCAST_LIST' }],
        }),
getAutoCareBroadcastRequest: build.query<AutoCareBroadcastRequest, string>({
            query: (broadcastId) => `/v1/broadcast-requests/${broadcastId}`,
            transformResponse: (value: unknown) => autoCareBroadcastSchema.parse(value),
            providesTags: (_result, _error, broadcastId) => [{ type: 'AutoCareMarketplace', id: `BROADCAST_${broadcastId}` }],
        }),
getOwnerAutoCareBroadcastRequests: build.query<AutoCareBroadcastRequest[], void>({
            query: () => '/owner/broadcast-requests',
            transformResponse: (value: unknown) => autoCareBroadcastsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'OWNER_BROADCAST_LIST' }],
        }),
createAutoCareBroadcastOffer: build.mutation<AutoCareBroadcastOffer, CreateAutoCareBroadcastOfferInput>({
            query: ({ broadcastId, ...body }) => ({ url: `/owner/broadcast-requests/${broadcastId}/offers`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareBroadcastOfferSchema.parse(value),
            invalidatesTags: (_result, _error, { broadcastId }) => [{ type: 'AutoCareMarketplace', id: `BROADCAST_${broadcastId}` }],
        }),
createAutoCareGuaranteeClaim: build.mutation<AutoCareGuaranteeClaim, CreateAutoCareGuaranteeClaimInput>({
            query: (body) => ({ url: '/v1/guarantee-claims', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareGuaranteeClaimSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'GUARANTEE_LIST' }],
        }),
getMyAutoCareGuaranteeClaims: build.query<AutoCareGuaranteeClaim[], void>({
            query: () => '/v1/guarantee-claims/my',
            transformResponse: (value: unknown) => autoCareGuaranteeClaimsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'GUARANTEE_LIST' }],
        }),
createAutoCareExpertQuestion: build.mutation<AutoCareExpertQuestion, CreateAutoCareExpertQuestionInput>({
            query: (body) => ({ url: '/v1/expert-questions', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareExpertQuestionSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'EXPERT_LIST' }],
        }),
getMyAutoCareExpertQuestions: build.query<AutoCareExpertQuestion[], void>({
            query: () => '/v1/expert-questions/my',
            transformResponse: (value: unknown) => autoCareExpertQuestionsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'EXPERT_LIST' }],
        }),
getMyAutoCareFleets: build.query<AutoCareFleet[], void>({
            query: () => '/owner/fleets',
            transformResponse: (value: unknown) => autoCareFleetsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'FLEET_LIST' }],
        }),
createAutoCareFleet: build.mutation<AutoCareFleet, CreateAutoCareFleetInput>({
            query: (body) => ({ url: '/owner/fleets', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFleetSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FLEET_LIST' }],
        }),
createAutoCareFleetVehicle: build.mutation<AutoCareFleetVehicle, CreateAutoCareFleetVehicleInput>({
            query: ({ fleetId, ...body }) => ({ url: `/owner/fleets/${fleetId}/vehicles`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareFleetVehicleSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareMarketplace', id: 'FLEET_LIST' }],
        })
    }
}
