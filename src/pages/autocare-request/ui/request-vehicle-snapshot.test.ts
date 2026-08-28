import { describe, expect, it } from 'vitest'

import { toRequestVehicleSnapshot } from './request-vehicle-snapshot'

describe('request vehicle snapshot', () => {
    it('preserves the booking-relevant identity fields from a saved vehicle', () => {
        expect(toRequestVehicleSnapshot({
            makeLabel: 'BMW',
            modelLabel: 'X5',
            year: 2021,
            fuelType: 'petrol',
            engineDisplacement: 3,
            horsepower: 249,
            color: 'Black',
            licensePlate: 'A123BC163',
            internalNumber: 'AC-001',
            vin: 'WBAXXXXXXXX123456',
        })).toEqual({
            make: 'BMW',
            model: 'X5',
            year: 2021,
            fuelType: 'petrol',
            engineDisplacement: 3,
            horsepower: 249,
            color: 'Black',
            licensePlate: 'A123BC163',
            internalNumber: 'AC-001',
            vin: 'WBAXXXXXXXX123456',
        })
    })

    it('does not build a booking snapshot for an incomplete or invalid vehicle', () => {
        expect(toRequestVehicleSnapshot({ make: 'BMW', model: 'X5', year: 0 })).toBeNull()
        expect(toRequestVehicleSnapshot({ make: 'BMW', year: 2021 })).toBeNull()
        expect(toRequestVehicleSnapshot(undefined)).toBeNull()
    })
})
