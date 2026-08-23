import { describe, expect, it } from 'vitest'

import { createAutoCareBookingSnapshot } from './booking-snapshot.js'

describe('createAutoCareBookingSnapshot', () => {
    it('copies the accepted quote and schedule into a confirmed immutable shape', () => {
        const snapshot = createAutoCareBookingSnapshot({
            requestId: 'request-1',
            quoteVersion: 3,
            amountMinor: 450_000,
            currencyCode: 'RUB',
            lineItems: [{ kind: 'labour', title: 'Диагностика', quantity: 1, unitPriceMinor: 450_000, totalMinor: 450_000 }],
            scheduledAt: '2026-08-22T10:00:00.000Z',
            timezone: 'Europe/Moscow',
            serviceSlug: 'diagnostics',
            providerId: 'provider-1',
            locationId: 'location-1',
            createdAt: '2026-08-20T10:00:00.000Z',
        })

        expect(snapshot).toMatchObject({ requestId: 'request-1', quoteVersion: 3, status: 'confirmed', timezone: 'Europe/Moscow' })
        expect(snapshot.lineItems).toHaveLength(1)
    })
})
