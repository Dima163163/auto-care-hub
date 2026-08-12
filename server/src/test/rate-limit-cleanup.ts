import { clearRateLimitBuckets } from '../shared/security/rate-limit.js'
import { getRedisClient, isRedisEnabled } from '../shared/redis/redis.js'

export async function clearRateLimitState() {
    clearRateLimitBuckets()

    if (!isRedisEnabled()) return

    const redis = getRedisClient()
    const keys: string[] = []
    let cursor = '0'

    do {
        const [nextCursor, scannedKeys] = await redis.scan(
            cursor,
            'MATCH',
            'ratelimit:*',
            'COUNT',
            500,
        )
        cursor = nextCursor
        keys.push(...scannedKeys)
    } while (cursor !== '0')

    if (keys.length > 0) {
        await redis.unlink(...keys)
    }
}
