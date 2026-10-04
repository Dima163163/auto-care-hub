import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareServiceRequest } from '@/entities/automotive-service'

import { OwnerCapacityCalendar } from './OwnerCapacityCalendar'

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'ru',
        t: (key: string, params?: { count?: number }) => ({
            'autocare.ownerCapacityCalendarTitle': 'Календарь филиала',
            'autocare.providerToday': 'Сегодня',
            'autocare.calendarSelected': 'Выбрано',
            'autocare.calendarNextMonth': 'Следующий месяц',
            'autocare.calendarPreviousMonth': 'Предыдущий месяц',
            'autocare.ownerCapacityCalendarConfirmedCount': `${params?.count ?? 0} подтверждённых записей`,
            'autocare.ownerCapacityCalendarNoConfirmed': 'Подтверждённых записей нет.',
        }[key] ?? key),
    }),
}))

const providerQuery = vi.hoisted(() => ({
    data: [{
        id: 'provider-1',
        name: 'ProService',
        locations: [{
            location: {
                id: 'location-1',
                address: 'Москва, ул. Льва Толстого, 18',
                appointmentCapacity: 2,
                timezone: 'America/Los_Angeles',
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
    const preferredAt = new Date()
    preferredAt.setHours(12, 0, 0, 0)
    return {
        id: 'request-1',
        status: 'accepted',
        preferredAt: preferredAt.toISOString(),
        locationId: 'location-1',
        serviceSlug: 'oil-change',
        serviceLabels: { ru: 'Замена масла' },
        ...overrides,
    } as AutoCareServiceRequest
}

describe('OwnerCapacityCalendar', () => {
    const onSelectRequest = vi.fn()

    beforeEach(() => {
        onSelectRequest.mockReset()
        providerQuery.data = [{
            id: 'provider-1',
            name: 'ProService',
            locations: [{
                location: {
                    id: 'location-1',
                    address: 'Москва, ул. Льва Толстого, 18',
                    appointmentCapacity: 2,
                    timezone: 'America/Los_Angeles',
                },
                offers: [],
            }],
        }]
        providerQuery.isLoading = false
        providerQuery.isError = false
    })

    it('localizes month navigation and day labels in the Russian workspace', () => {
        render(<OwnerCapacityCalendar requests={[]} onSelectRequest={onSelectRequest} />)
        expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeInTheDocument()
        const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? '').join(' ')
        expect(labels).not.toMatch(/Today|Sunday|Monday|October/)
        expect(labels).toContain(new Intl.DateTimeFormat('ru', { dateStyle: 'full' }).format(new Date()))
    })

    it('formats booking times in branch timezone and opens the booking from its existing control', async () => {
        const user = userEvent.setup()
        render(<OwnerCapacityCalendar requests={[makeRequest()]} onSelectRequest={onSelectRequest} />)

        const calendar = screen.getByTestId('owner-capacity-calendar')
        expect(calendar).toHaveTextContent('Календарь филиала')
        expect(calendar).toHaveTextContent('ProService')
        expect(calendar).toHaveTextContent('Москва, ул. Льва Толстого, 18')
        expect(calendar).toHaveTextContent('1 / 2')
        expect(calendar).toHaveTextContent('Замена масла')
        const bookingButton = screen.getByRole('button', { name: /Замена масла/ })
        const preferredAt = new Date()
        preferredAt.setHours(12, 0, 0, 0)
        const expectedBranchTime = new Intl.DateTimeFormat('ru-RU', { timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(preferredAt)
        expect(bookingButton).toHaveTextContent(expectedBranchTime)
        await user.click(bookingButton)
        expect(onSelectRequest).toHaveBeenCalledWith('request-1')
        expect(screen.queryByTestId('owner-capacity-resources')).not.toBeInTheDocument()
    })

    it('keeps a useful empty branch state when there are no appointments', () => {
        render(<OwnerCapacityCalendar requests={[]} onSelectRequest={onSelectRequest} />)

        expect(screen.getByTestId('owner-capacity-calendar')).toHaveTextContent('0 подтверждённых записей')
        expect(screen.getByTestId('owner-capacity-calendar')).toHaveTextContent('Подтверждённых записей нет.')
    })

    it('falls back safely when a branch timezone is missing or invalid', () => {
        providerQuery.data[0]!.locations[0]!.location.timezone = 'Mars/Olympus'
        render(<OwnerCapacityCalendar requests={[makeRequest()]} onSelectRequest={onSelectRequest} />)

        expect(screen.getByRole('button', { name: /Замена масла/ })).toBeVisible()
    })
    it('keeps scoped staff visits visible without catalog access and uses the request timezone', async () => {
        providerQuery.data = []
        const preferredAt = new Date(); preferredAt.setHours(12, 0, 0, 0)
        const timezone = 'Europe/Samara'
        const branchDay = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(preferredAt)
        const dayNumber = Number(branchDay.find((part) => part.type === 'day')?.value)
        const request = makeRequest({ preferredAt: preferredAt.toISOString(), timezone, providerName: 'Assigned ProService', address: 'Assigned branch address' })
        render(<OwnerCapacityCalendar requests={[request]} onSelectRequest={onSelectRequest} />)
        // The selected local calendar day may differ from the request's branch day.
        const current = new Date().getDate()
        if (dayNumber !== current) await userEvent.click(screen.getByRole('button', { name: new RegExp(`^.*${dayNumber} `) }))
        const visit = screen.getByRole('button', { name: /Assigned ProService/ })
        expect(visit).toHaveTextContent(new Intl.DateTimeFormat('ru', { timeZone: timezone, timeStyle: 'short' }).format(preferredAt))
        expect(visit).toHaveTextContent(timezone)
        expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
        await userEvent.click(visit)
        expect(onSelectRequest).toHaveBeenCalledWith(request.id)
    })

})
