import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMocks = vi.hoisted(() => ({
    set: vi.fn(),
    eval: vi.fn(),
}))

const postgres = vi.hoisted(() => ({ connect: vi.fn(), query: vi.fn(), release: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { createQueryRunner: () => postgres } }))

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
        postgres.connect.mockResolvedValue(undefined)
        postgres.query.mockResolvedValue([{ locked: true }])
        postgres.release.mockResolvedValue(undefined)
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
        expect(postgres.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(hashtext($1))', ['autocare-hub:maintenance-cycle:v1'])
        expect(postgres.release).toHaveBeenCalledOnce()
    })

    it('skips the cycle when another replica owns the lease', async () => {
        redisMocks.set.mockResolvedValue(null)
        const task = vi.fn()

        await expect(withMaintenanceLease(task)).resolves.toBeNull()
        expect(task).not.toHaveBeenCalled()
        expect(redisMocks.eval).not.toHaveBeenCalled()
    })
    it('releases Redis and the connection when the PostgreSQL lock is held elsewhere', async () => {
        postgres.query.mockResolvedValue([{ locked: false }])
        const task = vi.fn()
        await expect(withMaintenanceLease(task)).resolves.toBeNull()
        expect(task).not.toHaveBeenCalled()
        expect(redisMocks.eval).toHaveBeenCalledOnce()
        expect(postgres.release).toHaveBeenCalledOnce()
    })

})
