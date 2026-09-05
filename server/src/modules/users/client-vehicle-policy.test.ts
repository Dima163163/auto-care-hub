import { describe, expect, it } from 'vitest'

import { normalizeClientVehicleInput } from './client-vehicle-policy.js'

describe('client vehicle input policy', () => {
    it('normalizes a complete vehicle payload', () => {
        expect(normalizeClientVehicleInput({ brandId: ' BMW ', model: ' X5 ', year: 2021, fuelType: 'petrol', engineDisplacement: 2, horsepower: 249, color: ' Black ', vin: ' wba1234567890abcd ', licensePlate: ' A123AA  ', internalNumber: ' bay-1 ' }, 'create')).toEqual({ brandId: 'bmw', model: 'X5', year: 2021, fuelType: 'petrol', engineDisplacement: 2, horsepower: 249, color: 'Black', vin: 'WBA1234567890ABCD', licensePlate: 'A123AA', internalNumber: 'bay-1' })
    })

    it('accepts nullable fields and partial updates', () => {
        expect(normalizeClientVehicleInput({ vin: null, horsepower: null, licensePlate: null, internalNumber: '   ' }, 'patch')).toEqual({ vin: null, horsepower: null, licensePlate: null, internalNumber: null })
        expect(normalizeClientVehicleInput({}, 'patch')).toEqual({})
    })

    it('rejects missing required fields and unknown keys', () => {
        expect(normalizeClientVehicleInput({ brandId: 'bmw', model: 'x5' }, 'create')).toBeNull()
        expect(normalizeClientVehicleInput({ brandId: 'bmw', model: 'x5', year: 2021, fuelType: 'petrol', engineDisplacement: null, horsepower: null, color: 'black', vin: null, userId: 'leak' }, 'create')).toBeNull()
        expect(normalizeClientVehicleInput({ imageUrl: '/unsafe' }, 'patch')).toBeNull()
    })

    it('rejects malformed identity and bounded values', () => {
        const base = { brandId: 'bmw', model: 'x5', year: 2021, fuelType: 'petrol', engineDisplacement: 2, horsepower: 200, color: 'black', vin: null }
        expect(normalizeClientVehicleInput({ ...base, year: 2021.5 }, 'create')).toBeNull()
        expect(normalizeClientVehicleInput({ ...base, fuelType: 'steam' }, 'create')).toBeNull()
        expect(normalizeClientVehicleInput({ ...base, vin: 'not-a-vin' }, 'create')).toBeNull()
        expect(normalizeClientVehicleInput({ ...base, model: 'x'.repeat(121) }, 'create')).toBeNull()
    })
})
