import { describe, expect, it } from 'vitest'

import { getHealthStatus } from './health-status-policy.js'

describe('health status policy', () => {
    it('maps dependency failures to a degraded status', () => {
        expect(getHealthStatus(false)).toBe('ok')
        expect(getHealthStatus(true)).toBe('degraded')
    })
})
