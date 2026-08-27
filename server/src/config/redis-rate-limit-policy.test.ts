import { describe, expect, it } from 'vitest'

import { resolveRedisRateLimitFailureMode } from './redis-rate-limit-policy.js'

describe('Redis rate limit failure policy', () => {
    it('defaults to fail-closed in production and fail-open locally', () => {
        expect(resolveRedisRateLimitFailureMode('production')).toBe('fail-closed')
        expect(resolveRedisRateLimitFailureMode('development')).toBe('fail-open')
        expect(resolveRedisRateLimitFailureMode('test')).toBe('fail-open')
    })

    it('allows explicit local mode', () => {
        expect(resolveRedisRateLimitFailureMode('development', 'fail-closed')).toBe('fail-closed')
    })

    it('rejects invalid modes and production fail-open', () => {
        expect(() => resolveRedisRateLimitFailureMode('development', 'unknown')).toThrow()
        expect(() => resolveRedisRateLimitFailureMode('production', 'fail-open')).toThrow(
            'Production requires REDIS_RATE_LIMIT_FAILURE_MODE=fail-closed.',
        )
    })
})
