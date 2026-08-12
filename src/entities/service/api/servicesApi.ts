import { baseApi } from '@/shared/api/baseApi'
import { getCabinetAvailabilityInvalidationTags } from '@/shared/api/cache-tags'
import type { EntityId } from '@/shared/types/common'

import type { Service } from '../model/types'
import {
    normalizeDeleteServiceResponse,
    normalizeServiceListResponse,
    normalizeServiceResponse,
} from '../lib/service-response-schema'

type CreateServiceRequest = {
    cabinetId: string
    title: string
    description?: string | undefined
    durationMinutes: number
    price: number
    isActive: boolean
}

type UpdateServiceStatusRequest = {
    id: string
    cabinetId: string
    isActive: boolean
}

type UpdateServiceRequest = {
    id: string
    cabinetId: string
    title: string
    description?: string | undefined
    durationMinutes: number
    price: number
}

type DeleteServiceRequest = {
    id: string
    cabinetId: string
}

type DeleteServiceResponse = {
    success: true
}

export const servicesApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // Получение сервиса по id
        getServicesByCabinetId: build.query<Service[], EntityId>({
            query: (cabinetId) => `/services?cabinetId=${encodeURIComponent(cabinetId)}`,
            transformResponse: normalizeServiceListResponse,
            providesTags: (result, _error, cabinetId) =>
                result
                    ? [
                        ...result.map((service) => ({
                            type: 'Service' as const,
                            id: service.id
                        })),
                        {
                            type: 'Service' as const,
                            id: `CABINET-${cabinetId}`
                        }
                    ]
                : [
                        {
                            type: 'Service' as const,
                            id: `CABINET-${cabinetId}`
                        }
                    ]
        }),
        // Получение всех сервисов продавца
        getOwnerServices: build.query<Service[], void>({
            query: () => '/owner/services',
            transformResponse: normalizeServiceListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((service) => ({
                            type: 'Service' as const,
                            id: service.id
                        })),
                        {
                            type: 'Service' as const,
                            id: 'OWNER_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'Service' as const,
                            id: 'OWNER_LIST'
                        }
                    ]
        }),
        // Создание сервиса
        createService: build.mutation<Service, CreateServiceRequest>({
            query: (body) => ({
                url: '/services',
                method: 'POST',
                body
            }),
            transformResponse: normalizeServiceResponse,
            invalidatesTags: (_result, _error, body) => [
                {
                    type: 'Service',
                    id: `CABINET-${body.cabinetId}`
                },
                {
                    type: 'Service',
                    id: 'OWNER_LIST'
                },
                {
                    type: 'OwnerReadiness',
                    id: 'STATUS'
                },
                ...getCabinetAvailabilityInvalidationTags(body.cabinetId),
            ]
        }),
        // Получение всех сервисов
        getServices: build.query<Service[], EntityId>({
            query: (cabinetId) => `/services?cabinetId=${encodeURIComponent(cabinetId)}`,
            transformResponse: normalizeServiceListResponse,
            providesTags: (result, _error, cabinetId) =>
                result
                    ? [
                        ...result.map((service) => ({
                            type: 'Service' as const,
                            id: service.id
                        })),
                        {
                            type: 'Service' as const,
                            id: `CABINET-${cabinetId}`
                        }
                    ] : [
                        {
                            type: 'Service' as const,
                            id: `CABINET-${cabinetId}`
                        }
                    ]
        }),
        // Обновление статуса услуги
        updateServiceStatus: build.mutation<Service, UpdateServiceStatusRequest>({
            query: ({ id, isActive }) => ({
                url: `/services/${id}/status`,
                method: 'PATCH',
                body: {
                    isActive,
                },
            }),
            transformResponse: normalizeServiceResponse,
            invalidatesTags: (_result, _error, body) => [
                { type: 'Service', id: body.id },
                { type: 'Service', id: 'OWNER_LIST' },
                { type: 'Service', id: `CABINET-${body.cabinetId}` },
                { type: 'OwnerReadiness', id: 'STATUS' },
                ...getCabinetAvailabilityInvalidationTags(body.cabinetId),
            ],
        }),
        // Изменение сервисов
        updateService: build.mutation<Service, UpdateServiceRequest>({
            query: ({ id, cabinetId: _cabinetId, ...body }) => ({
                url: `/services/${id}`,
                method: 'PATCH',
                body
            }),
            transformResponse: normalizeServiceResponse,
            invalidatesTags: (_result, _error, body) => [
                { type: 'Service', id: body.id },
                { type: 'Service', id: 'OWNER_LIST' },
                { type: 'Service', id: `CABINET-${body.cabinetId}` },
                { type: 'OwnerReadiness', id: 'STATUS' },
                ...getCabinetAvailabilityInvalidationTags(body.cabinetId),
            ]
        }),
        // Удаление сервиса
        deleteService: build.mutation<DeleteServiceResponse, DeleteServiceRequest>({
            query: ({ id }) => ({
                url: `/services/${id}`,
                method: 'DELETE'
            }),
            transformResponse: normalizeDeleteServiceResponse,
            invalidatesTags: (_result, _error, body) => [
                { type: 'Service', id: body.id },
                { type: 'Service', id: 'OWNER_LIST' },
                { type: 'Service', id: `CABINET-${body.cabinetId}` },
                { type: 'OwnerReadiness', id: 'STATUS' },
                ...getCabinetAvailabilityInvalidationTags(body.cabinetId),
            ]
        })
    })
})

export const {
    useGetServicesByCabinetIdQuery,
    useGetOwnerServicesQuery,
    useCreateServiceMutation,
    useGetServicesQuery,
    useUpdateServiceStatusMutation,
    useUpdateServiceMutation,
    useDeleteServiceMutation
} = servicesApi
