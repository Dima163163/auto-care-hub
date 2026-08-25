import { describe, expect, it } from 'vitest'

import { supportsVehicleBrand } from './brandSpecialization'

describe('vehicle brand specialization', () => {
    it('matches a listed specialization', () => {
        expect(supportsVehicleBrand({ brandSpecializations: ['bmw'], isMultibrand: false }, 'bmw')).toBe(true)
        expect(supportsVehicleBrand({ brandSpecializations: ['bmw'], isMultibrand: false }, 'toyota')).toBe(false)
    })

    it('matches universal providers for every selected brand', () => {
        expect(supportsVehicleBrand({ brandSpecializations: [], isMultibrand: true }, 'toyota')).toBe(true)
        expect(supportsVehicleBrand({ brandSpecializations: [], isMultibrand: true })).toBe(true)
    })
})
