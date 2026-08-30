import { beforeEach, describe, expect, it, vi } from 'vitest'

import { env } from '../../config/env.js'
import {
    checkRateLimit,
    clearRateLimitBuckets,
    createRateLimitPreHandler,
    checkRateLimitRedis,
    getEmailRateLimitIdentifier,
    assertValidRateLimitOptions,
    getRateLimitHeaders,
    getAuthenticatedUserRateLimitIdentifier,
    mustFailClosedForRedisRateLimitFailure,
    MAX_RATE_LIMIT_REQUESTS,
    MAX_RATE_LIMIT_WINDOW_MS,
    MAX_RATE_LIMIT_SCOPE_LENGTH,
} from './rate-limit'
import type { FastifyReply, FastifyRequest } from 'fastify'

vi.mock('../redis/redis.js', () => ({
    getRedisClient: vi.fn(),
    isRedisEnabled: vi.fn(() => false),
}))

const options = {
    maxRequests: 2,
    scope: 'test',
    windowMs: 1000,
}

describe('checkRateLimit', () => {
    beforeEach(() => {
        clearRateLimitBuckets()
    })

    it('allows requests up to the configured limit', () => {
        expect(checkRateLimit('127.0.0.1', options, 1000)).toEqual({
            allowed: true,
            remaining: 1,
            resetAt: 2000,
        })
        expect(checkRateLimit('127.0.0.1', options, 1100)).toEqual({
            allowed: true,
            remaining: 0,
            resetAt: 2000,
        })
    })

    it('blocks requests after the configured limit', () => {
        checkRateLimit('127.0.0.1', options, 1000)
        checkRateLimit('127.0.0.1', options, 1100)

        expect(checkRateLimit('127.0.0.1', options, 1200)).toEqual({
            allowed: false,
            remaining: 0,
            resetAt: 2000,
        })
    })

    it('resets the bucket after the window expires', () => {
        checkRateLimit('127.0.0.1', options, 1000)
        checkRateLimit('127.0.0.1', options, 1100)

        expect(checkRateLimit('127.0.0.1', options, 2000)).toEqual({
            allowed: true,
            remaining: 1,
            resetAt: 3000,
        })
    })

    it('tracks scopes independently', () => {
        checkRateLimit('127.0.0.1', options, 1000)
        checkRateLimit('127.0.0.1', options, 1100)

        expect(
            checkRateLimit(
                '127.0.0.1',
                {
                    ...options,
                    scope: 'another',
                },
                1200
            ).allowed
        ).toBe(true)
    })
})

describe('rate limit configuration', () => {
    it('accepts bounded positive options', () => {
        expect(assertValidRateLimitOptions(options)).toBe(options)
    })

    it('rejects invalid limits, windows, and scopes', () => {
        expect(() => assertValidRateLimitOptions({ ...options, maxRequests: 0 })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, windowMs: 0 })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, scope: ' ' })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, maxRequests: 1.5 })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, maxRequests: MAX_RATE_LIMIT_REQUESTS + 1 })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, windowMs: MAX_RATE_LIMIT_WINDOW_MS + 1 })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, scope: 'x'.repeat(MAX_RATE_LIMIT_SCOPE_LENGTH + 1) })).toThrow()
        expect(() => assertValidRateLimitOptions({ ...options, scope: 'scope with spaces' })).toThrow()
    })
})

describe('Redis outage policy', () => {
    it('fails closed only in production because process-local buckets are not a distributed boundary', () => {
        expect(mustFailClosedForRedisRateLimitFailure('production')).toBe(true)
        expect(mustFailClosedForRedisRateLimitFailure('development')).toBe(false)
        expect(mustFailClosedForRedisRateLimitFailure('test')).toBe(false)
    })

    it('fails closed without mutating a local bucket when Redis is unavailable in fail-closed mode', async () => {
        const pipeline = {
            incr: vi.fn().mockReturnThis(),
            pttl: vi.fn().mockReturnThis(),
            exec: vi.fn().mockRejectedValue(new Error('redis unavailable')),
        }
        const redis = {
            pipeline: vi.fn(() => pipeline),
        }
        const originalMode = env.redis.rateLimitFailureMode

        env.redis.rateLimitFailureMode = 'fail-closed'

        try {
            const options = {
                maxRequests: 2,
                scope: 'redis-outage-sensitive',
                windowMs: 1_000,
            }

            expect(mustFailClosedForRedisRateLimitFailure()).toBe(true)
            await expect(checkRateLimitRedis('ip:203.0.113.10', options, redis as never)).rejects.toMatchObject({
                statusCode: 503,
                message: 'Rate limiting is temporarily unavailable. Please try again later.',
            })
            expect(pipeline.exec).toHaveBeenCalledOnce()
            expect(checkRateLimit('ip:203.0.113.10', options, 1_000)).toMatchObject({
                allowed: true,
                remaining: 1,
            })
        } finally {
            env.redis.rateLimitFailureMode = originalMode
        }
    })

    it('keeps the local fallback only when fail-open is explicitly selected outside production', async () => {
        const pipeline = {
            incr: vi.fn().mockReturnThis(),
            pttl: vi.fn().mockReturnThis(),
            exec: vi.fn().mockRejectedValue(new Error('redis unavailable')),
        }
        const redis = {
            pipeline: vi.fn(() => pipeline),
        }
        const originalMode = env.redis.rateLimitFailureMode

        env.redis.rateLimitFailureMode = 'fail-open'

        try {
            const options = {
                maxRequests: 1,
                scope: 'redis-outage-local',
                windowMs: 1_000,
            }

            await expect(checkRateLimitRedis('ip:203.0.113.11', options, redis as never)).resolves.toMatchObject({
                allowed: true,
                remaining: 0,
            })
            await expect(checkRateLimitRedis('ip:203.0.113.11', options, redis as never)).resolves.toMatchObject({
                allowed: false,
                remaining: 0,
            })
        } finally {
            env.redis.rateLimitFailureMode = originalMode
        }
    })
})

describe('rate limit response headers', () => {
    it('returns standard headers for allowed and denied results', () => {
        expect(getRateLimitHeaders({ allowed: true, remaining: 1, resetAt: 2_000 }, 2, 1_000)).toEqual({
            'RateLimit-Limit': 2,
            'RateLimit-Remaining': 1,
            'RateLimit-Reset': 1,
        })
        expect(getRateLimitHeaders({ allowed: false, remaining: 0, resetAt: 2_000 }, 2, 1_000)).toEqual({
            'RateLimit-Limit': 2,
            'RateLimit-Remaining': 0,
            'RateLimit-Reset': 1,
            'Retry-After': 1,
        })
    })
})

describe('composite rate limits', () => {
    const reply = {
        header: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply

    function request(ip: string, email: string) {
        return {
            ip,
            body: { email },
            headers: {},
        } as unknown as FastifyRequest
    }

    beforeEach(() => {
        clearRateLimitBuckets()
        vi.mocked(reply.header).mockClear()
    })

    it('keeps one email bucket across different NAT IPs', async () => {
        const preHandler = createRateLimitPreHandler({
            maxRequests: 1,
            scope: 'composite-email',
            windowMs: 1000,
            keyResolvers: [getEmailRateLimitIdentifier],
        })

        await preHandler(request('10.0.0.1', 'User@Example.com'), reply)
        expect(reply.header).toHaveBeenCalledWith('RateLimit-Limit', 1)
        expect(reply.header).toHaveBeenCalledWith('RateLimit-Remaining', 0)

        await expect(
            preHandler(request('10.0.0.2', ' user@example.com '), reply)
        ).rejects.toMatchObject({ statusCode: 429 })
        expect(reply.header).toHaveBeenCalledWith('Retry-After', expect.any(Number))
    })

    it('keeps one IP bucket across different account emails', async () => {
        const preHandler = createRateLimitPreHandler({
            maxRequests: 1,
            scope: 'composite-ip',
            windowMs: 1000,
            keyResolvers: [getEmailRateLimitIdentifier],
        })

        await preHandler(request('10.0.0.3', 'first@example.com'), reply)

        await expect(
            preHandler(request('10.0.0.3', 'second@example.com'), reply)
        ).rejects.toMatchObject({ statusCode: 429 })
    })
})

describe('authenticated rate limit identifiers', () => {
    it('ignores missing and malformed bearer credentials', () => {
        expect(getAuthenticatedUserRateLimitIdentifier({ headers: {} } as unknown as FastifyRequest)).toBeUndefined()
        expect(getAuthenticatedUserRateLimitIdentifier({ headers: { authorization: 'Basic token' } } as unknown as FastifyRequest)).toBeUndefined()
        expect(getAuthenticatedUserRateLimitIdentifier({ headers: { authorization: 'Bearer malformed' } } as unknown as FastifyRequest)).toBeUndefined()
    })
})
