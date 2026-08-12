import { describe, expect, it } from 'vitest'

import { getCabinetPagination } from './cabinet-pagination-policy.js'

describe('cabinet pagination policy', () => {
    it('returns bounded defaults and explicit values', () => {
        expect(getCabinetPagination()).toEqual({ page: 1, limit: 12 })
        expect(getCabinetPagination(4, 20)).toEqual({ page: 4, limit: 20 })
    })

    it('rejects unsafe page and limit values', () => {
        expect(() => getCabinetPagination(0, 12)).toThrow(/invalid/)
        expect(() => getCabinetPagination(1, 51)).toThrow(/invalid/)
    })
})
