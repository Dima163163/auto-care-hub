import { describe, expect, it } from 'vitest'

import { normalizeAutoCareFleetInput, normalizeAutoCareFleetVehicleInput } from './fleet-input-policy.js'

describe('AutoCare fleet input policy', () => {
    it('canonicalizes fleet names, notes and nullable approval policy', () => {
        expect(normalizeAutoCareFleetInput({ name: '  Ａuto fleet  ', notes: '  Служебные автомобили  ' })).toEqual({ name: 'Auto fleet', notes: 'Служебные автомобили' })
        expect(normalizeAutoCareFleetInput({ name: 'Auto fleet', notes: null })).toEqual({ name: 'Auto fleet', notes: null })
    })

    it('canonicalizes scalar fleet vehicle snapshots without changing field names', () => {
        expect(normalizeAutoCareFleetVehicleInput({
            label: '  BMW X5  ',
            vehicleSnapshot: { brandId: '  bmw  ', modelId: ' x5 ', year: 2021, registrationNumber: null },
            approvalPolicy: '  Нужна проверка  ',
        })).toEqual({
            label: 'BMW X5',
            vehicleSnapshot: { brandId: 'bmw', modelId: 'x5', year: 2021, registrationNumber: null },
            approvalPolicy: 'Нужна проверка',
        })
    })

    it('rejects unknown fields, nested values and oversized collections', () => {
        expect(normalizeAutoCareFleetInput({ name: 'Valid fleet', unknown: true })).toBeNull()
        expect(normalizeAutoCareFleetInput({ name: 'Valid fleet', notes: 'x'.repeat(4_001) })).toBeNull()
        expect(normalizeAutoCareFleetVehicleInput({ label: 'Car', vehicleSnapshot: { details: { vin: 'hidden' } } })).toBeNull()
        expect(normalizeAutoCareFleetVehicleInput({ label: 'Car', vehicleSnapshot: Object.fromEntries(Array.from({ length: 25 }, (_, index) => [`field-${index}`, index])) })).toBeNull()
    })

    it('rejects malformed scalar values and non-object payloads', () => {
        expect(normalizeAutoCareFleetInput(null)).toBeNull()
        expect(normalizeAutoCareFleetInput({ name: ' ' })).toBeNull()
        expect(normalizeAutoCareFleetVehicleInput(null)).toBeNull()
        expect(normalizeAutoCareFleetVehicleInput({ label: 'Car', vehicleSnapshot: { year: Number.NaN } })).toBeNull()
        expect(normalizeAutoCareFleetVehicleInput({ label: 'Car', vehicleSnapshot: { year: 2021 }, approvalPolicy: 42 })).toBeNull()
    })
})
