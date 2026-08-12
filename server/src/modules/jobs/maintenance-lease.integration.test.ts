import { describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/redis/redis.js', () => ({
    getRedisClient: () => {
        throw new Error('Redis must not be used by the PostgreSQL lease integration test.')
    },
    isRedisEnabled: () => false,
}))

import { withMaintenanceLease } from './maintenance-lease.service.js'

describe('maintenance PostgreSQL lease integration', () => {
    it('allows only one concurrent cycle to own the advisory lock', async () => {
        let allowFirstToFinish = () => undefined
        let signalFirstLeaseAcquired = () => undefined
        const firstLeaseAcquired = new Promise<void>((resolve) => {
            signalFirstLeaseAcquired = resolve
        })
        const allowFirstToFinishPromise = new Promise<void>((resolve) => {
            allowFirstToFinish = resolve
        })
        const first = withMaintenanceLease(async (lease) => {
            lease.assertHeld()
            signalFirstLeaseAcquired()
            await allowFirstToFinishPromise
            lease.assertHeld()
            return 'first'
        })

        await firstLeaseAcquired
        await expect(withMaintenanceLease(async () => 'second')).resolves.toBeNull()
        allowFirstToFinish()
        await expect(first).resolves.toBe('first')
    })
})
