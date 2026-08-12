import { baseApi } from '@/shared/api/baseApi'
import type { Cabinet, CabinetStatus } from '../model/types'
import type { EntityId } from '@/shared/types/common'
import {
    normalizeCabinetListResponse,
    normalizeCabinetPageResponse,
    normalizeCabinetResponse,
    normalizeDeleteCabinetResponse,
    normalizeUploadCabinetImageResponse,
} from '../lib/cabinet-response-schema'
import {
    normalizeCabinetBlockedPeriodsResponse,
    normalizeCabinetScheduleExceptionsResponse,
    normalizeCabinetScheduleResponse,
} from '../lib/cabinet-schedule-response-schema'
import { mergeCabinetPage } from '../lib/mergeCabinetPage'
import { getCabinetAvailabilityInvalidationTags } from '@/shared/api/cache-tags'

type CreateCabinetRequest = {
    title: string
    description: string
    address: string
    city: string
    pricePerHour: number
    photos?: string[]
    amenities?: string[]
    cancellationPolicy?: string | null
    houseRules?: string | null
}

type UploadCabinetImageRequest = {
    fileName: string
    mimeType: string
    size: number
    contentBase64: string
}

type UploadCabinetImageResponse = {
    url: string
}

type UpdateAdminCabinetStatusRequest = {
    id: string
    status: CabinetStatus
}

type UpdateCabinetRequest = {
    id: string
    title: string
    description: string
    address: string
    city: string
    pricePerHour: number
    photos?: string[]
    amenities?: string[]
    cancellationPolicy?: string | null
    houseRules?: string | null
}

type DeleteCabinetRequest = {
    id: string
}

type DeleteCabinetResponse = {
    success: true
}

export type CabinetScheduleItem = {
    weekday: number
    openTime: string
    closeTime: string
    isOpen: boolean
}
export type CabinetScheduleException = {
    date: string
    openTime: string | null
    closeTime: string | null
    isClosed: boolean
}
export type CabinetBlockedPeriod = {
    id?: string | undefined
    date: string
    startTime: string | null
    endTime: string | null
    kind: 'blocked' | 'holiday'
    reason: string | null
}

export type GetCabinetsRequest = {
    search?: string | undefined
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | undefined
    city?: string | undefined
    category?: string | undefined
    minPrice?: number | undefined
    maxPrice?: number | undefined
    minRating?: number | undefined
    service?: string | undefined
    availableToday?: boolean | undefined
    availabilityDate?: string | undefined
    durationMinutes?: number | undefined
    page?: number | undefined
    limit?: number | undefined
}

type PaginatedCabinetsResponse = {
    items: Cabinet[]
    total: number
    page: number
    totalPages: number
}

export const cabinetsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getCabinets: build.query<PaginatedCabinetsResponse, GetCabinetsRequest | void>({
            query: (params) => params
                ? { url: '/cabinets', params }
                : '/cabinets',
            transformResponse: normalizeCabinetPageResponse,
            // Use serializeQueryArgs to treat different pages of the same search/sort as the same cache entry
            serializeQueryArgs: ({ queryArgs }) => {
                const { page, ...argsWithoutPage } = queryArgs || {}
                return argsWithoutPage
            },
            // Merge new items into the existing cache
            merge: (currentCache, newItems, { arg }) => {
                return mergeCabinetPage(currentCache, newItems, arg?.page)
            },
            // Refetch when the page argument changes
            forceRefetch({ currentArg, previousArg }) {
                return currentArg?.page !== previousArg?.page
            },
            providesTags: (result) =>
                result?.items
                    ? [
                        ...result.items.map((cabinet) => ({
                                type: 'Cabinet' as const,
                                id: cabinet.id
                            })),
                            {
                                type: 'Cabinet' as const,
                                id: 'LIST'
                            }
                        ]
                    : [
                        {
                            type: 'Cabinet' as const,
                            id: 'LIST'
                        }
                    ]
        }),

        getCabinetById: build.query<Cabinet, EntityId>({
            query: (id) => `/cabinets/${id}`,
            transformResponse: normalizeCabinetResponse,
            providesTags: (_result, _error, id) => [
                {
                    type: 'Cabinet',
                    id
                }
            ]
        }),

        getOwnerCabinets: build.query<Cabinet[], void>({
            query: () => '/owner/cabinets',
            transformResponse: normalizeCabinetListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((cabinet) => ({
                            type: 'Cabinet' as const,
                            id: cabinet.id
                        })),
                        {
                            type: 'Cabinet' as const,
                            id: 'OWNER_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'Cabinet' as const,
                            id: 'OWNER_LIST'
                        }
                    ]
        }),
        getOwnerCabinetSchedule: build.query<{ items: CabinetScheduleItem[] }, EntityId>({
            query: (id) => `/owner/cabinets/${id}/schedule`,
            transformResponse: normalizeCabinetScheduleResponse,
            providesTags: (_result, _error, id) => [
                { type: 'CabinetSchedule', id },
            ],
        }),
        updateOwnerCabinetSchedule: build.mutation<{ items: CabinetScheduleItem[] }, { id: EntityId; items: CabinetScheduleItem[] }>({
            query: ({ id, items }) => ({
                url: `/owner/cabinets/${id}/schedule`,
                method: 'PUT',
                body: { items },
            }),
            transformResponse: normalizeCabinetScheduleResponse,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'CabinetSchedule', id },
                { type: 'Cabinet', id },
                { type: 'OwnerReadiness', id: 'STATUS' },
                ...getCabinetAvailabilityInvalidationTags(id),
            ],
        }),
        getOwnerCabinetScheduleExceptions: build.query<{ items: CabinetScheduleException[] }, EntityId>({
            query: (id) => `/owner/cabinets/${id}/schedule-exceptions`,
            transformResponse: normalizeCabinetScheduleExceptionsResponse,
            providesTags: (_result, _error, id) => [
                { type: 'CabinetScheduleExceptions', id },
            ],
        }),
        updateOwnerCabinetScheduleExceptions: build.mutation<
            { items: CabinetScheduleException[] },
            { id: EntityId; items: CabinetScheduleException[] }
        >({
            query: ({ id, items }) => ({
                url: `/owner/cabinets/${id}/schedule-exceptions`,
                method: 'PUT',
                body: { items },
            }),
            transformResponse: normalizeCabinetScheduleExceptionsResponse,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'CabinetScheduleExceptions', id },
                { type: 'Cabinet', id },
                { type: 'OwnerReadiness', id: 'STATUS' },
                ...getCabinetAvailabilityInvalidationTags(id),
            ],
        }),
        getOwnerCabinetBlockedPeriods: build.query<{ items: CabinetBlockedPeriod[] }, EntityId>({
            query: (id) => `/owner/cabinets/${id}/blocked-periods`,
            transformResponse: normalizeCabinetBlockedPeriodsResponse,
            providesTags: (_result, _error, id) => [
                { type: 'CabinetBlockedPeriods', id },
            ],
        }),
        updateOwnerCabinetBlockedPeriods: build.mutation<{ items: CabinetBlockedPeriod[] }, { id: EntityId; items: CabinetBlockedPeriod[] }>({
            query: ({ id, items }) => ({
                url: `/owner/cabinets/${id}/blocked-periods`,
                method: 'PUT',
                body: { items },
            }),
            transformResponse: normalizeCabinetBlockedPeriodsResponse,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'CabinetBlockedPeriods', id },
                { type: 'Cabinet', id },
                { type: 'OwnerReadiness', id: 'STATUS' },
                ...getCabinetAvailabilityInvalidationTags(id),
            ],
        }),

        getAdminCabinets: build.query<Cabinet[], void>({
            query: () => '/admin/cabinets',
            transformResponse: normalizeCabinetListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((cabinet) => ({
                            type: 'Cabinet' as const,
                            id: cabinet.id
                        })),
                        {
                            type: 'Cabinet' as const,
                            id: 'ADMIN_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'Cabinet' as const,
                            id: 'ADMIN_LIST'
                        }
                    ]
        }),

        createCabinet: build.mutation<Cabinet, CreateCabinetRequest>({
            query: (body) => ({
                url: '/cabinets',
                method: 'POST',
                body
            }),
            transformResponse: normalizeCabinetResponse,
            invalidatesTags: [
                {
                    type: 'Cabinet',
                    id: 'OWNER_LIST'
                },
                {
                    type: 'Cabinet',
                    id: 'ADMIN_LIST'
                },
                {
                    type: 'Cabinet',
                    id: 'LIST'
                },
                {
                    type: 'OwnerReadiness',
                    id: 'STATUS'
                },
                'AuditLogs',
            ]
        }),

        uploadCabinetImage: build.mutation<
            UploadCabinetImageResponse,
            UploadCabinetImageRequest
        >({
            query: (body) => ({
                url: '/cabinet-images',
                method: 'POST',
                body
            }),
            transformResponse: normalizeUploadCabinetImageResponse,
        }),

        updateAdminCabinetStatus: build.mutation<Cabinet, UpdateAdminCabinetStatusRequest>({
            query: ({ id, status }) => ({
                url: `/admin/cabinets/${id}/status`,
                method: 'PATCH',
                body: {
                    status
                }
            }),
            transformResponse: normalizeCabinetResponse,
            invalidatesTags: (_result, _error, { id }) => [
                {
                    type: 'Cabinet',
                    id
                },
                {
                    type: 'Cabinet',
                    id: 'ADMIN_LIST'
                },
                {
                    type: 'Cabinet',
                    id: 'OWNER_LIST'
                },
                {
                    type: 'Cabinet',
                    id: 'LIST'
                }
            ]
        }),
        getAllCabinets: build.query<Cabinet[], void>({
            query: () => '/cabinets/all',
            transformResponse: normalizeCabinetListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((cabinet) => ({
                            type: 'Cabinet' as const,
                            id: cabinet.id
                        })),
                        {
                            type: 'Cabinet' as const,
                            id: 'ALL_LIST'
                        }
                    ] : [
                        {
                            type: 'Cabinet' as const,
                            id: 'ALL_LIST'
                        }
                    ]
        }),

        getOwnerCabinetById: build.query<Cabinet, string>({
            query: (id) => `/owner/cabinets/${id}`,
            transformResponse: normalizeCabinetResponse,
            providesTags: (_result, _error, id) => [
                { type: 'Cabinet', id }
            ]
        }),

        updateCabinet: build.mutation<Cabinet, UpdateCabinetRequest>({
            query: ({ id, ...body }) => ({
                url: `/cabinets/${id}`,
                method: 'PATCH',
                body
            }),
            transformResponse: normalizeCabinetResponse,
            invalidatesTags: (_result, _error, body) => [
                { type: 'Cabinet', id: body.id },
                { type: 'Cabinet', id: 'OWNER_LIST' },
                { type: 'Cabinet', id: 'ADMIN_LIST' },
                { type: 'Cabinet', id: 'LIST' },
                { type: 'Cabinet', id: 'ALL_LIST' },
                { type: 'OwnerReadiness', id: 'STATUS' }
            ]
        }),

        deleteCabinet: build.mutation<DeleteCabinetResponse, DeleteCabinetRequest>({
            query: ({ id }) => ({
                url: `/cabinets/${id}`,
                method: 'DELETE'
            }),
            transformResponse: normalizeDeleteCabinetResponse,
            invalidatesTags: (_result, _error, body) => [
                { type: 'Cabinet', id: body.id },
                { type: 'Cabinet', id: 'OWNER_LIST' },
                { type: 'Cabinet', id: 'ADMIN_LIST' },
                { type: 'Cabinet', id: 'LIST' },
                { type: 'Cabinet', id: 'ALL_LIST' },
                { type: 'Service', id: 'OWNER_LIST' },
                { type: 'Service', id: `CABINET-${body.id}` },
                { type: 'OwnerReadiness', id: 'STATUS' },
            ]
        })
    })
})

export const {
    useGetCabinetsQuery,
    useGetCabinetByIdQuery,
    useGetOwnerCabinetsQuery,
    useGetAdminCabinetsQuery,
    useCreateCabinetMutation,
    useUploadCabinetImageMutation,
    useUpdateAdminCabinetStatusMutation,
    useGetAllCabinetsQuery,
    useGetOwnerCabinetByIdQuery,
    useUpdateCabinetMutation,
    useDeleteCabinetMutation,
    useGetOwnerCabinetScheduleQuery,
    useUpdateOwnerCabinetScheduleMutation,
    useGetOwnerCabinetScheduleExceptionsQuery,
    useUpdateOwnerCabinetScheduleExceptionsMutation,
    useGetOwnerCabinetBlockedPeriodsQuery,
    useUpdateOwnerCabinetBlockedPeriodsMutation,
} = cabinetsApi
