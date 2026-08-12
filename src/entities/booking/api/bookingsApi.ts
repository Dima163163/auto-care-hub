import { baseApi } from '@/shared/api/baseApi'

import type {
    Booking,
    BookingStatus,
    ClientBooking,
    OwnerBooking,
    BookingStatusHistory,
    BookingRescheduleRequest,
    BookingPaymentStatusResponse,
    ResolveBookingRescheduleResponse,
} from '../model/types'

import type { EntityId } from '@/shared/types/common'
import {
    normalizeBookingResponse,
    normalizeBookingStatusHistoryResponse,
    normalizeCheckoutResponse,
    normalizeClientBookingListResponse,
    normalizeOccupiedSlotsResponse,
    normalizeOwnerBookingListResponse,
    normalizeOwnerBookingResponse,
    normalizePaymentStatusResponse,
    normalizeRescheduleRequestListResponse,
    normalizeRescheduleRequestResponse,
    normalizeResolveBookingRescheduleResponse,
} from '../lib/booking-response-schema'

type UpdateBookingStatusRequest = {
    id: string
    status: BookingStatus
}

type UpdateOwnerBookingNoteRequest = {
    id: EntityId
    note: string | null
}

type CreateBookingRequest = {
    clientId: string
    cabinetId: string
    serviceId: string
    date: string
    startTime: string
    endTime: string
    comment?: string | undefined
}

export type CreateMyBookingRequest = {
    cabinetId: string
    serviceId: string
    date: string
    startTime: string
    endTime: string
    comment?: string | undefined
    idempotencyKey?: string | undefined
    experiment?: 'book_again' | undefined
    sourceBookingId?: string | undefined
}

export type OccupiedSlot = {
    start: string
    end: string
}

type GetOccupiedSlotsRequest = {
    cabinetId: string
    date: string
}

type RequestBookingRescheduleInput = {
    id: EntityId
    date: string
    startTime: string
    endTime: string
}

type ResolveBookingRescheduleInput = {
    id: EntityId
    decision: 'accepted' | 'rejected'
    reason?: string | undefined
}

export type BookingPaymentCheckout = {
    url: string
    attemptId: EntityId
    reused: boolean
}

export const bookingsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // Получить все бронирования владельца кабинета
        getOwnerBookings: build.query<OwnerBooking[], void>({
            query: () => '/owner/bookings?limit=50',
            transformResponse: normalizeOwnerBookingListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((booking) => ({
                            type: 'Booking' as const,
                            id: booking.id
                        })),
                        {
                            type: 'Booking' as const,
                            id: 'OWNER_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'Booking' as const,
                            id: 'OWNER_LIST'
                        }
                    ]
        }),
        getBookingStatusHistory: build.query<BookingStatusHistory[], EntityId>({
            query: (id) => `/bookings/${id}/history`,
            transformResponse: normalizeBookingStatusHistoryResponse,
            providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
        }),
        getMyBookingPaymentStatus: build.query<BookingPaymentStatusResponse, EntityId>({
            query: (id) => `/bookings/${id}/payment/status`,
            transformResponse: normalizePaymentStatusResponse,
            providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
        }),
        getOwnerPendingRescheduleRequests: build.query<BookingRescheduleRequest[], void>({
            query: () => '/owner/bookings/reschedule-requests',
            transformResponse: normalizeRescheduleRequestListResponse,
            providesTags: [{ type: 'Booking', id: 'RESCHEDULE_REQUESTS' }],
        }),
        requestBookingReschedule: build.mutation<BookingRescheduleRequest, RequestBookingRescheduleInput>({
            query: ({ id, ...body }) => ({
                url: `/bookings/${id}/reschedule`,
                method: 'POST',
                body,
            }),
            transformResponse: normalizeRescheduleRequestResponse,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Booking', id },
                { type: 'Booking', id: 'MY_LIST' },
                { type: 'Booking', id: 'OWNER_LIST' },
                { type: 'Booking', id: 'RESCHEDULE_REQUESTS' },
                { type: 'Notification', id: 'LIST' },
                { type: 'Notification', id: 'UNREAD_COUNT' },
            ],
        }),
        resolveBookingReschedule: build.mutation<ResolveBookingRescheduleResponse, ResolveBookingRescheduleInput>({
            query: ({ id, ...body }) => ({
                url: `/owner/bookings/${id}/reschedule`,
                method: 'PATCH',
                body,
            }),
            transformResponse: normalizeResolveBookingRescheduleResponse,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Booking', id },
                { type: 'Booking', id: 'MY_LIST' },
                { type: 'Booking', id: 'OWNER_LIST' },
                { type: 'Booking', id: 'RESCHEDULE_REQUESTS' },
                { type: 'Notification', id: 'LIST' },
                { type: 'Notification', id: 'UNREAD_COUNT' },
            ],
        }),
        createBookingPaymentCheckout: build.mutation<BookingPaymentCheckout, EntityId>({
            query: (id) => ({
                url: `/bookings/${id}/payment/checkout`,
                method: 'POST',
            }),
            transformResponse: normalizeCheckoutResponse,
            invalidatesTags: (_result, _error, id) => [
                { type: 'Booking', id },
            ],
        }),
        // Обновление статуса бронирования
        updateBookingStatus: build.mutation<OwnerBooking, UpdateBookingStatusRequest>({
            query: ({ id, status }) => ({
                url: `/bookings/${id}/status`,
                method: 'PATCH',
                body: {
                    status
                }
            }),
            transformResponse: normalizeOwnerBookingResponse,
            invalidatesTags: (result, _error, { id }) => [
                {
                    type: 'Booking',
                    id: 'OWNER_LIST'
                },
                {
                    type: 'Booking',
                    id: 'MY_LIST'
                },
                {
                    type: 'Booking',
                    id
                },
                {
                    type: 'Booking',
                    id: 'OCCUPIED_SLOTS'
                },
                { type: 'Cabinet', id: result?.cabinetId ?? 'LIST' },
                { type: 'Cabinet', id: 'LIST' },
                {
                    type: 'Notification',
                    id: 'LIST'
                },
                {
                    type: 'Notification',
                    id: 'UNREAD_COUNT'
                }
            ]
        }),
        updateOwnerBookingNote: build.mutation<OwnerBooking, UpdateOwnerBookingNoteRequest>({
            query: ({ id, note }) => ({
                url: `/owner/bookings/${id}/note`,
                method: 'PATCH',
                body: { note },
            }),
            transformResponse: normalizeOwnerBookingResponse,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Booking', id },
                { type: 'Booking', id: 'OWNER_LIST' },
            ],
        }),

        createBooking: build.mutation<OwnerBooking, CreateBookingRequest>({
            query: (body) => ({
                url: '/owner/bookings',
                method: 'POST',
                body
            }),
            transformResponse: normalizeOwnerBookingResponse,
            invalidatesTags: (_result, _error, body) => [
                {
                    type: 'Booking',
                    id: 'OWNER_LIST'
                },
                {
                    type: 'Booking',
                    id: 'OCCUPIED_SLOTS'
                },
                { type: 'Cabinet', id: body.cabinetId },
                { type: 'Cabinet', id: 'LIST' },
                {
                    type: 'Notification',
                    id: 'LIST'
                },
                {
                    type: 'Notification',
                    id: 'UNREAD_COUNT'
                }
            ]
        }),
        // Данные о бронированиях клиента
        getMyBookings: build.query<ClientBooking[], void>({
            query: () => '/bookings/my',
            transformResponse: normalizeClientBookingListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((booking) => ({
                            type: 'Booking' as const,
                            id: booking.id
                        })),
                        {
                            type: 'Booking' as const,
                            id: 'MY_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'Booking' as const,
                            id: 'MY_LIST'
                        }
                    ]
        }),
        // Отмена бронирования клиентом
        cancelMyBooking: build.mutation<Booking, { id: EntityId; reason: string }>({
            query: ({ id, reason }) => ({
                url: `/bookings/${id}/cancel`,
                method: 'PATCH',
                body: { reason }
            }),
            transformResponse: normalizeBookingResponse,
            invalidatesTags: (result, _error, { id }) => [
                {
                    type: 'Booking',
                    id
                },
                {
                    type: 'Booking',
                    id: 'MY_LIST'
                },
                {
                    type: 'Booking',
                    id: 'OWNER_LIST'
                },
                {
                    type: 'Booking',
                    id: 'OCCUPIED_SLOTS'
                },
                { type: 'Cabinet', id: result?.cabinetId ?? 'LIST' },
                { type: 'Cabinet', id: 'LIST' },
                {
                    type: 'Notification',
                    id: 'LIST'
                },
                {
                    type: 'Notification',
                    id: 'UNREAD_COUNT'
                }
            ]
        }),
        // Запись на услугу клиентом
        createMyBooking: build.mutation<Booking, CreateMyBookingRequest>({
            query: ({ idempotencyKey, ...body }) => ({
                url: '/bookings',
                method: 'POST',
                headers: idempotencyKey
                    ? { 'Idempotency-Key': idempotencyKey }
                    : undefined,
                body: {
                    ...body,
                    clientId: undefined,
                    status: 'pending',
                }
            }),
            transformResponse: normalizeBookingResponse,
            invalidatesTags: (_result, _error, body) => [
                { type: 'Booking', id: 'MY_LIST' },
                { type: 'Booking', id: 'OWNER_LIST' },
                { type: 'Booking', id: 'OCCUPIED_SLOTS' },
                { type: 'Cabinet', id: body.cabinetId },
                { type: 'Cabinet', id: 'LIST' },
                { type: 'Notification', id: 'LIST' },
                { type: 'Notification', id: 'UNREAD_COUNT' },
                { type: 'Service', id: `CABINET-${body.cabinetId}` }
            ]
        }),

        getOccupiedSlots: build.query<OccupiedSlot[], GetOccupiedSlotsRequest>({
            query: (params) => ({
                url: '/bookings/occupied',
                params,
            }),
            transformResponse: normalizeOccupiedSlotsResponse,
            providesTags: [
                {
                    type: 'Booking',
                    id: 'OCCUPIED_SLOTS',
                },
            ],
        })
    })
})

export const {
    useGetOwnerBookingsQuery,
    useGetBookingStatusHistoryQuery,
    useGetMyBookingPaymentStatusQuery,
    useGetOwnerPendingRescheduleRequestsQuery,
    useRequestBookingRescheduleMutation,
    useResolveBookingRescheduleMutation,
    useCreateBookingPaymentCheckoutMutation,
    useUpdateBookingStatusMutation,
    useUpdateOwnerBookingNoteMutation,
    useCreateBookingMutation,
    useGetMyBookingsQuery,
    useCancelMyBookingMutation,
    useCreateMyBookingMutation,
    useGetOccupiedSlotsQuery,
} = bookingsApi
