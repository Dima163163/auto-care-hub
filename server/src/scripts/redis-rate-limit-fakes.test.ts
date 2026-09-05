import { describe, expect, it } from 'vitest'

import { pingRedisWithTimeout } from './check-redis-rate-limit-fail-closed.js'
import { DeterministicFakeRedisAdapter } from './redis-rate-limit-fakes.js'

describe('deterministic Redis fail-closed harness', () => {
    it('reproduces outage and reconnect without process-local fallback', async () => {
        const redis = new DeterministicFakeRedisAdapter()
        redis.setState('outage')
        await expect(pingRedisWithTimeout(() => redis.ping(), 250)).rejects.toThrow('synthetic Redis outage')
        redis.setState('ready')
        await expect(pingRedisWithTimeout(() => redis.ping(), 250)).resolves.toBe('PONG')
        expect(redis.pings).toEqual(['outage', 'ready'])
    })

    it('returns a bounded timeout code when Redis never resolves', async () => {
        await expect(pingRedisWithTimeout(() => new Promise(() => undefined), 250)).rejects.toMatchObject({ code: 'REDIS_TIMEOUT' })
    })
})
