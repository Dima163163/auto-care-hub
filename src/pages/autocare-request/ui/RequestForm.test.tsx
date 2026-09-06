import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequestForm } from './RequestForm'

const mocks = vi.hoisted(() => ({
    getAvailability: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAutoCareAvailabilityQuery: mocks.getAvailability,
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'en-US',
        t: (key: string) => key,
    }),
}))

function renderForm(initialEntry: string, onSubmit = vi.fn()) {
    return {
        onSubmit,
        ...render(
            <MemoryRouter initialEntries={[initialEntry]}>
                <RequestForm
                    providerId="provider-1"
                    locationId="location-1"
                    offeringId="offering-1"
                    serviceTimezone="Europe/Moscow"
                    onSubmit={onSubmit}
                />
            </MemoryRouter>,
        ),
    }
}

describe('RequestForm appointment slot contract', () => {
    beforeEach(() => {
        mocks.getAvailability.mockReset().mockImplementation(({ date }: { date: string }) => ({
            data: {
                date,
                timezone: 'Europe/Moscow',
                durationMinutes: 60,
                slots: [{ startTime: '10:00', endTime: '11:00', startsAt: `${date}T07:00:00.000Z` }],
            },
            isError: false,
            isFetching: false,
        }))
    })

    it('submits the server slot instant instead of browser-local Date arithmetic', () => {
        const { container, onSubmit } = renderForm('/services/provider-1/request?date=2026-09-05&time=10:00')

        fireEvent.submit(container.querySelector('form')!)

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ preferredAt: '2026-09-05T07:00:00.000Z' }))
    })

    it('keeps the Moscow service date when the browser is in New York', () => {
        const previousTimezone = process.env.TZ
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-03-29T22:30:00.000Z'))
        process.env.TZ = 'America/New_York'

        try {
            renderForm('/services/provider-1/request')

            expect(mocks.getAvailability.mock.calls[0]?.[0].date).toBe('2026-03-30')
            expect(screen.getByText('(Europe/Moscow)')).toBeInTheDocument()
        } finally {
            if (previousTimezone === undefined) delete process.env.TZ
            else process.env.TZ = previousTimezone
            vi.useRealTimers()
        }
    })

    it('recovers from a malformed URL date without passing it to availability or throwing during render', () => {
        expect(() => renderForm('/services/provider-1/request?date=garbageT12:00:00')).not.toThrow()

        expect(mocks.getAvailability).toHaveBeenCalled()
        expect(mocks.getAvailability.mock.calls[0]?.[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(mocks.getAvailability.mock.calls[0]?.[0].date).not.toBe('garbageT12:00:00')
    })
})
