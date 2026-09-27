import { describe, expect, it } from 'vitest'

import { getHealthStatus, getReadinessHttpStatus } from './health-status-policy.js'

describe('health status policy', () => {
    it('maps dependency failures to a degraded status', () => {
        expect(getHealthStatus(false)).toBe('ok')
        expect(getHealthStatus(true)).toBe('degraded')
    })

    it('reports optional SMTP degradation without withdrawing core API readiness', () => {
        expect(getHealthStatus(false, true)).toBe('degraded')
        expect(getReadinessHttpStatus(false)).toBe(200)
        expect(getReadinessHttpStatus(true)).toBe(503)
    })
})
