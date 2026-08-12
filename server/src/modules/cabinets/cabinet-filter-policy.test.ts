import { describe, expect, it } from 'vitest'

import { assertCabinetNumericFilters } from './cabinet-filter-policy.js'

describe('cabinet numeric filter policy', () => {
    it('accepts bounded price and rating filters', () => {
        expect(assertCabinetNumericFilters({ minPrice: 10, maxPrice: 100, minRating: 4 })).toBeUndefined()
    })

    it('rejects reversed prices and ratings outside five stars', () => {
        expect(() => assertCabinetNumericFilters({ minPrice: 101, maxPrice: 100 })).toThrow(/range/)
        expect(() => assertCabinetNumericFilters({ minRating: 0 })).toThrow(/rating/)
        expect(() => assertCabinetNumericFilters({ minRating: 5.1 })).toThrow(/rating/)
    })
})
