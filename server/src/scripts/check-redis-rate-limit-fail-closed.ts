import { env } from '../config/env.js'
import { getRedisClient, disconnectRedis } from '../shared/redis/redis.js'

async function run() {
    if (env.redis.rateLimitFailureMode !== 'fail-closed') {
        if (env.nodeEnv === 'production') {
            throw new Error('Production Redis rate limiting must use fail-closed mode.')
        }
        console.log(`[redis-rate-limit] ${env.nodeEnv} mode is ${env.redis.rateLimitFailureMode}; production rehearsal skipped.`)
        return
    }

    if (!env.redis.enabled) {
        throw new Error('Fail-closed Redis rehearsal requires Redis to be enabled.')
    }

    const redis = getRedisClient()
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Redis health check timed out.')), 5_000).unref()
    })
    await Promise.race([redis.ping(), timeout])
    console.log('[redis-rate-limit] distributed limiter is reachable and configured fail-closed.')
}

run()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : 'Redis rate limit policy check failed.')
        process.exitCode = 1
    })
    .finally(async () => {
        await disconnectRedis().catch(() => undefined)
    })
