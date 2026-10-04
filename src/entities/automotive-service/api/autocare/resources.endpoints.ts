import { z } from 'zod'
import { autoCareCapacityReservationSchema, autoCareCapacityResourceSchema } from './resources.schemas'
import type { AutoCareCapacityReservation, AutoCareCapacityResource, CreateAutoCareCapacityResourceInput, UpdateAutoCareCapacityResourceInput } from './resources.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createResourcesEndpoints(build: AutoCareEndpointBuilder) {
    return {
getOwnerAutoCareCapacityResources: build.query<AutoCareCapacityResource[], { providerId: string; locationId?: string }>({
            query: ({ providerId, locationId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/resources`, params: locationId ? { locationId } : undefined }),
            transformResponse: (value: unknown) => z.array(autoCareCapacityResourceSchema).parse(value),
            providesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `RESOURCES_${providerId}` }],
        }),
getOwnerAutoCareCapacityReservations: build.query<AutoCareCapacityReservation[], { providerId: string; locationId?: string; from?: string; to?: string }>({
            query: ({ providerId, ...params }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/resource-reservations`, params }),
            transformResponse: (value: unknown) => z.array(autoCareCapacityReservationSchema).parse(value),
            providesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `RESERVATIONS_${providerId}` }],
        }),
createOwnerAutoCareCapacityResource: build.mutation<AutoCareCapacityResource, { providerId: string } & CreateAutoCareCapacityResourceInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/resources`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareCapacityResourceSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `RESOURCES_${providerId}` }],
        }),
updateOwnerAutoCareCapacityResource: build.mutation<AutoCareCapacityResource, UpdateAutoCareCapacityResourceInput>({
            query: ({ providerId, resourceId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/resources/${encodeURIComponent(resourceId)}`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareCapacityResourceSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `RESOURCES_${providerId}` }],
        })
    }
}
