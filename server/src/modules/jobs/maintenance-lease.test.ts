import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMocks = vi.hoisted(() => ({
    set: vi.fn(),
    eval: vi.fn(),
}))

vi.mock('../../shared/redis/redis.js', () => ({
    getRedisClient: () => redisMocks,
    isRedisEnabled: () => true,
}))

import { withMaintenanceLease } from './maintenance-lease.service.js'

describe('maintenance lease', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        redisMocks.set.mockResolvedValue('OK')
        redisMocks.eval.mockResolvedValue(1)
    })

    it('runs one cycle and releases the Redis token', async () => {
        const task = vi.fn(async (lease: { assertHeld: () => void }) => {
            lease.assertHeld()
            return 'completed'
        })

        await expect(withMaintenanceLease(task)).resolves.toBe('completed')
        expect(task).toHaveBeenCalledOnce()
        expect(redisMocks.set).toHaveBeenCalledWith(
            'autocare-hub:maintenance-cycle:v1',
            expect.any(String),
            'PX',
            30_000,
            'NX',
        )
        expect(redisMocks.eval).toHaveBeenCalledOnce()
    })

    it('skips the cycle when another replica owns the lease', async () => {
        redisMocks.set.mockResolvedValue(null)
        const task = vi.fn()

        await expect(withMaintenanceLease(task)).resolves.toBeNull()
        expect(task).not.toHaveBeenCalled()
        expect(redisMocks.eval).not.toHaveBeenCalled()
    })
})
