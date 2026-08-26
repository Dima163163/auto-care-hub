import { describe, expect, it } from 'vitest'

import { createAutoCareBookingSnapshot } from './booking-snapshot.js'

describe('AutoCare booking snapshot', () => {
    it('preserves the vehicle id and immutable identity fields', () => {
        const snapshot = createAutoCareBookingSnapshot({
            requestId: 'request-1',
            quoteVersion: 2,
            amountMinor: 290_000,
            currencyCode: 'RUB',
            lineItems: [],
            scheduledAt: '2026-08-26T10:00:00.000Z',
            timezone: 'Europe/Samara',
            serviceSlug: 'oil-change',
            providerId: 'provider-1',
            locationId: 'location-1',
            createdAt: '2026-08-25T10:00:00.000Z',
            vehicleId: 'vehicle-1',
            vehicleSnapshot: {
                make: 'BMW',
                model: 'X5',
                year: 2021,
                licensePlate: 'A123BC163',
                internalNumber: 'AC-001',
                vin: 'WBA1234567890ABCD',
            },
        })

        expect(snapshot).toMatchObject({
            status: 'confirmed',
            vehicleId: 'vehicle-1',
            vehicleSnapshot: {
                licensePlate: 'A123BC163',
                internalNumber: 'AC-001',
                vin: 'WBA1234567890ABCD',
            },
        })
    })
})
