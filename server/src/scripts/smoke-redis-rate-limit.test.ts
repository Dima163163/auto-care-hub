import { describe, expect, it } from 'vitest'

import { summarizeRedisRateLimitResults } from './smoke-redis-rate-limit.js'

describe('Redis multi-process smoke report', () => {
    it('accepts exactly one allowed and one denied worker result', () => {
        expect(summarizeRedisRateLimitResults([
            { allowed: true, remaining: 0 },
            { allowed: false, remaining: 0 },
        ])).toEqual({
            schemaVersion: 1,
            status: 'pass',
            processCount: 2,
            allowedCount: 1,
            deniedCount: 1,
        })
    })

    it('fails closed when both workers are allowed or denied', () => {
        expect(() => summarizeRedisRateLimitResults([
            { allowed: true, remaining: 0 },
            { allowed: true, remaining: 0 },
        ])).toThrow('exactly one allowed and one denied')
        expect(() => summarizeRedisRateLimitResults([
            { allowed: false, remaining: 0 },
            { allowed: false, remaining: 0 },
        ])).toThrow('exactly one allowed and one denied')
    })
})
