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

    it('preserves the quote version and deep-copies line items for later edits', () => {
        const lineItems = [{ kind: 'parts' as const, title: 'Масляный фильтр', quantity: 1, unitPriceMinor: 2_500, totalMinor: 2_500 }]
        const snapshot = createAutoCareBookingSnapshot({
            requestId: 'request-2', quoteVersion: 7, amountMinor: 2_500, currencyCode: 'RUB', lineItems,
            scheduledAt: '2026-08-22T11:00:00.000Z', timezone: 'Europe/Samara', serviceSlug: 'oil-change',
            providerId: 'provider-1', locationId: 'location-1', createdAt: '2026-08-20T10:00:00.000Z',
        })

        lineItems[0].title = 'Изменённое описание'
        expect(snapshot.quoteVersion).toBe(7)
        expect(snapshot.lineItems[0]?.title).toBe('Масляный фильтр')
    })
})
