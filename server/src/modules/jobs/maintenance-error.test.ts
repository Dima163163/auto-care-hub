import { describe, expect, it } from 'vitest'

import { OperationTimeoutError } from '../../shared/lifecycle/with-timeout.js'
import { classifyMaintenanceError } from './maintenance-error.js'

describe('maintenance error classification', () => {
    it('separates timeout and lease loss', () => {
        expect(classifyMaintenanceError(new OperationTimeoutError('cycle', 1000))).toBe('timeout')
        expect(classifyMaintenanceError(new Error('Maintenance lease was lost before the cycle completed.'))).toBe('lease_lost')
    })

    it('classifies dependency and unknown failures safely', () => {
        expect(classifyMaintenanceError(new Error('database unavailable'))).toBe('dependency')
        expect(classifyMaintenanceError({ reason: 'unknown' })).toBe('unknown')
    })
})
