import { describe, expect, it } from 'vitest'

import type { Cabinet } from '@/entities/cabinet'
import { getCabinetMapPosition } from './cabinetMapCoordinates'

const cabinet = (id: string, city: string): Cabinet => ({
    id,
    ownerId: 'owner-1',
    title: 'Cabinet',
    description: 'A cabinet for private appointments.',
    address: 'Main street 1',
    city,
    pricePerHour: 2000,
    status: 'active',
    photos: [],
    createdAt: '2026-08-04T00:00:00.000Z',
})

describe('getCabinetMapPosition', () => {
    it('keeps known cities near their public approximate center', () => {
        const [latitude, longitude] = getCabinetMapPosition(cabinet('moscow-1', 'Moscow'))

        expect(latitude).toBeGreaterThan(55.73)
        expect(latitude).toBeLessThan(55.77)
        expect(longitude).toBeGreaterThan(37.59)
        expect(longitude).toBeLessThan(37.65)
    })

    it('returns stable positions for the same cabinet', () => {
        expect(getCabinetMapPosition(cabinet('stable-1', 'Kazan'))).toEqual(
            getCabinetMapPosition(cabinet('stable-1', 'Kazan')),
        )
    })

    it('uses a bounded fallback for an unknown city', () => {
        const [latitude, longitude] = getCabinetMapPosition(cabinet('unknown-1', 'Unknown city'))

        expect(latitude).toBeGreaterThan(55.73)
        expect(latitude).toBeLessThan(55.77)
        expect(longitude).toBeGreaterThan(37.59)
        expect(longitude).toBeLessThan(37.65)
    })
})
