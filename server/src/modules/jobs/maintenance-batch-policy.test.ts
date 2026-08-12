import { describe, expect, it } from 'vitest'

import {
    assertMaintenanceReferenceCount,
    MAX_MAINTENANCE_REFERENCED_PHOTOS,
} from './maintenance-batch-policy.js'

describe('maintenance batch policy', () => {
    it('accepts a bounded image reference inventory', () => {
        expect(assertMaintenanceReferenceCount(0)).toBeUndefined()
        expect(assertMaintenanceReferenceCount(MAX_MAINTENANCE_REFERENCED_PHOTOS)).toBeUndefined()
    })

    it('rejects invalid reference inventories', () => {
        expect(() => assertMaintenanceReferenceCount(-1)).toThrow(/reference/)
        expect(() => assertMaintenanceReferenceCount(MAX_MAINTENANCE_REFERENCED_PHOTOS + 1)).toThrow(/reference/)
    })
})
