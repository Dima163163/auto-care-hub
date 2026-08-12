import { Redis } from 'ioredis'
import { env } from '../../config/env.js'
import { logError } from '../observability/logger.js'

let redis: Redis | null = null

export function isRedisEnabled() {
    return env.redis.enabled
}

export function getRedisClient(): Redis {
    if (!env.redis.enabled) {
        throw new Error('Redis is not configured.')
    }

    if (!redis) {
        const options = {
            retryStrategy(times: number) {
                const delay = Math.min(times * 50, 2000)
                return delay
            },
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
        }

        redis = env.redis.url ? new Redis(env.redis.url, options) : new Redis({
            host: env.redis.host,
            port: env.redis.port,
            password: env.redis.password ?? undefined,
            ...options,
        })

        redis.on('error', (error) => {
            logError('Redis connection error', error)
        })
    }

    return redis
}

export async function disconnectRedis() {
    if (redis) {
        await redis.quit()
        redis = null
    }
}
