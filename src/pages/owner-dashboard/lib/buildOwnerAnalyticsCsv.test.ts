import { describe, expect, it } from 'vitest'

import { buildOwnerAnalyticsCsv } from './buildOwnerAnalyticsCsv'

const labels = {
    date: 'Date',
    time: 'Time',
    status: 'Status',
    cabinet: 'Cabinet',
    service: 'Service',
    city: 'City',
    durationMinutes: 'Duration (min)',
    price: 'Price',
}

describe('buildOwnerAnalyticsCsv', () => {
    it('exports owner-safe booking analytics without client details', () => {
        const csv = buildOwnerAnalyticsCsv([
            {
                id: 'booking-1',
                clientId: 'client-1',
                cabinetId: 'cabinet-1',
                serviceId: 'service-1',
                date: '2026-08-11',
                startTime: '09:00',
                endTime: '10:30',
                status: 'confirmed',
                createdAt: '2026-08-01T10:00:00.000Z',
                cabinet: { id: 'cabinet-1', title: 'Bright, Studio', address: 'Secret street 1', city: 'Samara' },
                service: { id: 'service-1', title: 'Consultation', durationMinutes: 90, price: 120 },
                client: { id: 'client-1', name: 'Private Client', email: 'client@example.com', phone: '+79990000000' },
                ownerNote: 'Private note',
            },
        ], labels)

        expect(csv).toContain('"Bright, Studio"')
        expect(csv).toContain('09:00-10:30,confirmed')
        expect(csv).toContain('90,120')
        expect(csv).not.toContain('Private Client')
        expect(csv).not.toContain('client@example.com')
        expect(csv).not.toContain('Private note')
        expect(csv).not.toContain('Secret street 1')
    })

    it('normalizes malformed time values to a zero duration', () => {
        const csv = buildOwnerAnalyticsCsv([
            {
                id: 'booking-1',
                clientId: 'client-1',
                cabinetId: 'cabinet-1',
                serviceId: 'service-1',
                date: '2026-08-11',
                startTime: 'bad',
                endTime: 'also-bad',
                status: 'pending',
                createdAt: '2026-08-01T10:00:00.000Z',
                cabinet: { id: 'cabinet-1', title: 'Studio', address: 'Address', city: 'Samara' },
                service: { id: 'service-1', title: 'Service', durationMinutes: 60, price: 100 },
                client: { id: 'client-1', name: 'Client', email: 'client@example.com', phone: null },
                ownerNote: null,
            },
        ], labels)

        expect(csv).toContain('0,100')
    })
})
