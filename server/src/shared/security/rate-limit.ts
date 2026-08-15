import { createHmac } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '../../config/env.js'
import { verifyAccessToken } from '../../modules/auth/auth-token.js'
import { AppError } from '../errors/app-error.js'
import { ERROR_CODES } from '../errors/error-codes.js'
import { getRedisClient, isRedisEnabled } from '../redis/redis.js'
import { logError } from '../observability/logger.js'
import { normalizeIpAddress } from './trusted-proxy.js'
import { normalizeRateLimitKey } from './rate-limit-keys.js'

type RateLimitState = {
    count: number
    resetAt: number
}

export const MAX_RATE_LIMIT_REQUESTS = 1_000_000
export const MAX_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1_000
export const MAX_RATE_LIMIT_SCOPE_LENGTH = 120

export type RateLimitOptions = {
    maxRequests: number
    scope: string
    windowMs: number
    keyResolvers?: RateLimitKeyResolver[]
}

export type RateLimitIdentifier = {
    kind: 'email' | 'ip' | 'user'
    value: string
}

export type RateLimitKeyResolver = (
    request: FastifyRequest
) => RateLimitIdentifier | undefined

export type RateLimitResult = {
    allowed: boolean
    remaining: number
    resetAt: number
}

export function assertValidRateLimitOptions(options: RateLimitOptions) {
    if (!Number.isSafeInteger(options.maxRequests) || options.maxRequests < 1 || options.maxRequests > MAX_RATE_LIMIT_REQUESTS) {
        throw new Error('Rate limit maxRequests must be a positive integer.')
    }

    if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1 || options.windowMs > MAX_RATE_LIMIT_WINDOW_MS) {
        throw new Error('Rate limit windowMs must be a positive integer.')
    }

    if (
        !options.scope.trim()
        || options.scope.length > MAX_RATE_LIMIT_SCOPE_LENGTH
        || !/^[a-zA-Z0-9:_-]+$/.test(options.scope)
    ) {
        throw new Error('Rate limit scope must not be empty.')
    }

    return options
}

const buckets = new Map<string, RateLimitState>()

function hashRateLimitValue(value: string) {
    return createHmac('sha256', env.auth.jwtAccessSecret)
        .update(value)
        .digest('hex')
}

function getRequestBodyRecord(request: FastifyRequest) {
    if (
        typeof request.body !== 'object' ||
        request.body === null ||
        Array.isArray(request.body)
    ) {
        return undefined
    }

    return request.body as Record<string, unknown>
}

export function getEmailRateLimitIdentifier(
    request: FastifyRequest
): RateLimitIdentifier | undefined {
    const email = getRequestBodyRecord(request)?.email

    if (typeof email !== 'string') return undefined

    const normalizedEmail = normalizeRateLimitKey(email)

    if (!normalizedEmail) return undefined

    return {
        kind: 'email',
        value: hashRateLimitValue(normalizedEmail),
    }
}

export function getAuthenticatedUserRateLimitIdentifier(
    request: FastifyRequest
): RateLimitIdentifier | undefined {
    const authorization = request.headers.authorization

    if (typeof authorization !== 'string') return undefined

    const match = /^Bearer\s+(\S+)$/.exec(authorization)

    if (!match?.[1]) return undefined

    try {
        const payload = verifyAccessToken(match[1])

        return {
            kind: 'user',
            value: hashRateLimitValue(payload.userId),
        }
    } catch {
        return undefined
    }
}

function getRateLimitIdentifiers(
    request: FastifyRequest,
    options: RateLimitOptions
) {
    const identifiers: RateLimitIdentifier[] = [
        {
            kind: 'ip',
            value: normalizeIpAddress(request.ip) ?? request.ip.trim().toLowerCase(),
        },
    ]

    for (const resolver of options.keyResolvers ?? []) {
        const identifier = resolver(request)

        if (identifier) {
            identifiers.push(identifier)
        }
    }

    return Array.from(
        new Map(
            identifiers.map((identifier) => [
                `${identifier.kind}:${identifier.value}`,
                identifier,
            ])
        ).values()
    )
}

function getBucketKey(scope: string, identifier: string) {
    return `${scope}:${identifier}`
}

export function checkRateLimit(
    identifier: string,
    options: RateLimitOptions,
    now = Date.now()
): RateLimitResult {
    const bucketKey = getBucketKey(options.scope, identifier)
    const currentBucket = buckets.get(bucketKey)

    if (!currentBucket || currentBucket.resetAt <= now) {
        const resetAt = now + options.windowMs

        buckets.set(bucketKey, {
            count: 1,
            resetAt,
        })

        return {
            allowed: true,
            remaining: options.maxRequests - 1,
            resetAt,
        }
    }

    if (currentBucket.count >= options.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: currentBucket.resetAt,
        }
    }

    currentBucket.count += 1

    return {
        allowed: true,
        remaining: options.maxRequests - currentBucket.count,
        resetAt: currentBucket.resetAt,
    }
}

export function getRateLimitHeaders(
    result: RateLimitResult,
    maxRequests: number,
    now = Date.now(),
) {
    const resetSeconds = Math.ceil((result.resetAt - now) / 1000)
    const headers: Record<string, number> = {
        'RateLimit-Limit': maxRequests,
        'RateLimit-Remaining': result.remaining,
        'RateLimit-Reset': Math.max(resetSeconds, 0),
    }

    if (!result.allowed) {
        headers['Retry-After'] = Math.max(resetSeconds, 1)
    }

    return headers
}

async function checkRateLimitRedis(
    identifier: string,
    options: RateLimitOptions
): Promise<RateLimitResult> {
    const redis = getRedisClient()
    const bucketKey = `ratelimit:${options.scope}:${identifier}`

    try {
        const pipeline = redis.pipeline()
        pipeline.incr(bucketKey)
        pipeline.pttl(bucketKey)

        const results = await pipeline.exec()

        if (!results) {
            throw new Error('Pipeline failed')
        }

        const [incrErr, count] = results[0] as [Error | null, number]
        const [ttlErr, pttl] = results[1] as [Error | null, number]

        if (incrErr) throw incrErr
        if (ttlErr) throw ttlErr

        // Set expiry on the first request and repair buckets whose TTL was
        // lost after a Redis failover/restart. Without this guard a bucket
        // can remain immortal and permanently block a user.
        if (count === 1 || pttl < 0) {
            await redis.pexpire(bucketKey, options.windowMs)
        }

        const resetAt = Date.now() + (pttl > 0 ? pttl : options.windowMs)

        return {
            allowed: count <= options.maxRequests,
            remaining: Math.max(0, options.maxRequests - count),
            resetAt,
        }
    } catch (error) {
        logError('Redis rate limit error; falling back to memory', error, {
            scope: options.scope,
        })
        return checkRateLimit(identifier, options)
    }
}

export function clearRateLimitBuckets() {
    buckets.clear()
}

export function createRateLimitPreHandler(options: RateLimitOptions) {
    assertValidRateLimitOptions(options)

    return async (request: FastifyRequest, reply: FastifyReply) => {
        const identifiers = getRateLimitIdentifiers(request, options)
        const results = await Promise.all(
            identifiers.map((identifier) => {
                const bucketIdentifier = `${identifier.kind}:${identifier.value}`

                return isRedisEnabled()
                    ? checkRateLimitRedis(bucketIdentifier, options)
                    : checkRateLimit(bucketIdentifier, options)
            })
        )
        const deniedResults = results.filter((result) => !result.allowed)
        const result = {
            allowed: deniedResults.length === 0,
            remaining: Math.min(...results.map((item) => item.remaining)),
            resetAt: Math.max(
                ...(deniedResults.length > 0 ? deniedResults : results).map(
                    (item) => item.resetAt
                )
            ),
        }
        const headers = getRateLimitHeaders(result, options.maxRequests)
        for (const [name, value] of Object.entries(headers)) {
            reply.header(name, value)
        }

        if (result.allowed) {
            return
        }

        throw new AppError({
            statusCode: 429,
            code: ERROR_CODES.TooManyRequests,
            message: 'Too many requests. Please try again later.',
        })
    }
}
