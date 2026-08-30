import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareServiceRequest } from '@/entities/automotive-service'

import { OwnerCapacityCalendar } from './OwnerCapacityCalendar'

const providerQuery = vi.hoisted(() => ({
    data: [{
        id: 'provider-1',
        name: 'ProService',
        locations: [{
            location: {
                id: 'location-1',
                address: 'Москва, ул. Льва Толстого, 18',
                appointmentCapacity: 2,
            },
            offers: [],
        }],
    }],
    isLoading: false,
    isError: false,
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareProvidersQuery: () => providerQuery,
}))

function makeRequest(overrides: Partial<AutoCareServiceRequest> = {}) {
    return {
        id: 'request-1',
        status: 'accepted',
        preferredAt: new Date().toISOString(),
        locationId: 'location-1',
        serviceSlug: 'oil-change',
        serviceLabels: { ru: 'Замена масла' },
        ...overrides,
    } as AutoCareServiceRequest
}

describe('OwnerCapacityCalendar', () => {
    beforeEach(() => {
        providerQuery.data = [{
            id: 'provider-1',
            name: 'ProService',
            locations: [{
                location: {
                    id: 'location-1',
                    address: 'Москва, ул. Льва Толстого, 18',
                    appointmentCapacity: 2,
                },
                offers: [],
            }],
        }]
        providerQuery.isLoading = false
        providerQuery.isError = false
    })

    it('shows branch occupancy and appointments without the post-MVP resource editor', () => {
        render(<OwnerCapacityCalendar requests={[makeRequest()]} locale="ru" />)

        const calendar = screen.getByTestId('owner-capacity-calendar')
        expect(calendar).toHaveTextContent('Календарь филиала')
        expect(calendar).toHaveTextContent('ProService')
        expect(calendar).toHaveTextContent('Москва, ул. Льва Толстого, 18')
        expect(calendar).toHaveTextContent('1 / 2')
        expect(calendar).toHaveTextContent('Замена масла')
        expect(screen.queryByTestId('owner-capacity-resources')).not.toBeInTheDocument()
    })

    it('keeps a useful empty branch state when there are no appointments', () => {
        render(<OwnerCapacityCalendar requests={[]} locale="ru" />)

        expect(screen.getByTestId('owner-capacity-calendar')).toHaveTextContent('0 подтверждённых записей')
        expect(screen.getByTestId('owner-capacity-calendar')).toHaveTextContent('Подтверждённых записей нет.')
    })
})
