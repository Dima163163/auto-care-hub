import { describe, expect, it } from 'vitest'

import { assertMaintenanceLeaseTiming } from './maintenance-lease-policy.js'

describe('maintenance lease timing policy', () => {
    it('accepts a renew interval shorter than the lease', () => {
        expect(assertMaintenanceLeaseTiming(30_000, 10_000)).toBeUndefined()
    })

    it('rejects unsafe lease timing', () => {
        expect(() => assertMaintenanceLeaseTiming(10_000, 10_000)).toThrow(/invalid/)
        expect(() => assertMaintenanceLeaseTiming(0, 1)).toThrow(/invalid/)
    })
})
