import { describe, expect, it } from 'vitest'

import { createFleetVehicleDraft, parseFleetVehicleDraft } from './owner-fleet-vehicle-draft'

describe('owner fleet vehicle draft', () => {
    it('persists only non-sensitive vehicle selection fields', () => {
        const draft = createFleetVehicleDraft({
            brandId: 'bmw',
            modelId: 'x5',
            year: '2021',
            registrationNumber: 'A123BC163',
            internalReference: 'AC-001',
            vin: 'WBAXXXXXXXX123456',
        })

        expect(draft).toEqual({ brandId: 'bmw', modelId: 'x5', year: '2021' })
        expect(draft).not.toHaveProperty('registrationNumber')
        expect(draft).not.toHaveProperty('internalReference')
        expect(draft).not.toHaveProperty('vin')
    })

    it('ignores unexpected sensitive fields while restoring a draft', () => {
        expect(parseFleetVehicleDraft({
            brandId: 'bmw',
            modelId: 'x5',
            year: '2021',
            registrationNumber: 'A123BC163',
            vin: 'WBAXXXXXXXX123456',
        })).toEqual({ brandId: 'bmw', modelId: 'x5', year: '2021' })
    })
})
