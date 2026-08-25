import { describe, expect, it } from 'vitest'

import { getVehicleCatalog, vehicleCatalog, vehicleFuelTypes } from './vehicle-catalog.js'

describe('vehicle catalog', () => {
    it('contains a broad multi-market make and model catalog', () => {
        expect(vehicleCatalog.length).toBeGreaterThan(25)
        expect(vehicleCatalog.flatMap((brand) => brand.models).length).toBeGreaterThan(90)
        expect(vehicleCatalog.some((brand) => brand.id === 'tesla')).toBe(true)
        expect(vehicleCatalog.some((brand) => brand.id === 'lada')).toBe(true)
    })

    it('exposes engine fuel metadata and supports brand filtering', () => {
        expect(vehicleFuelTypes).toContain('hydrogen')
        expect(getVehicleCatalog('tesla')[0]?.models[0]?.engines[0]?.fuelType).toBe('electric')
        expect(getVehicleCatalog('unknown-brand')).toEqual([])
    })
})
