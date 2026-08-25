import { baseApi } from '@/shared/api/baseApi'

export const ownerActionCenterEventNames = [
    'pending_bookings',
    'reschedule_requests',
    'draft_cabinets',
    'blocked_cabinets',
    'readiness',
] as const

export type OwnerActionCenterEventName = typeof ownerActionCenterEventNames[number]

type OwnerActionCenterEventResponse = {
    accepted: true
}

export const ownerActionCenterApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        recordOwnerActionCenterEvent: build.mutation<OwnerActionCenterEventResponse, { action: OwnerActionCenterEventName }>({
            query: (body) => ({
                url: '/owner/action-center/events',
                method: 'POST',
                body,
            }),
        }),
    }),
})

export const { useRecordOwnerActionCenterEventMutation } = ownerActionCenterApi
