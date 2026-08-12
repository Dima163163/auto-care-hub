import { describe, expect, it } from 'vitest'

import {
    getMaintenanceDeleteBatchSize,
    MAX_MAINTENANCE_DELETE_BATCH,
} from './maintenance-cleanup-policy.js'

describe('maintenance cleanup policy', () => {
    it('returns a bounded delete batch size', () => {
        expect(getMaintenanceDeleteBatchSize()).toBe(100)
        expect(getMaintenanceDeleteBatchSize(MAX_MAINTENANCE_DELETE_BATCH)).toBe(MAX_MAINTENANCE_DELETE_BATCH)
    })

    it('rejects unsafe cleanup batch sizes', () => {
        expect(() => getMaintenanceDeleteBatchSize(0)).toThrow(/invalid/)
        expect(() => getMaintenanceDeleteBatchSize(MAX_MAINTENANCE_DELETE_BATCH + 1)).toThrow(/invalid/)
    })
})
