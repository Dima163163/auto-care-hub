import { describe, expect, it } from 'vitest'

import { assertCabinetSort, CABINET_SORT_OPTIONS } from './cabinet-sort-policy.js'

describe('cabinet sort policy', () => {
    it('accepts known sort options', () => {
        expect(assertCabinetSort('popular')).toBe('popular')
        expect(assertCabinetSort(undefined)).toBeUndefined()
        expect(CABINET_SORT_OPTIONS).toHaveLength(4)
    })

    it('rejects unknown sort options', () => {
        expect(() => assertCabinetSort('random')).toThrow(/sort/)
    })
})
