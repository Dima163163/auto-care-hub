import { randomUUID } from 'node:crypto'

import { AppDataSource } from '../../database/data-source.js'
import { isRedisEnabled, getRedisClient } from '../../shared/redis/redis.js'
import { logError } from '../../shared/observability/logger.js'
import { assertMaintenanceLeaseTiming } from './maintenance-lease-policy.js'

const MAINTENANCE_LOCK_NAME = 'autocare-hub:maintenance-cycle:v1'
const LEASE_TTL_MS = 30_000
const LEASE_RENEW_INTERVAL_MS = 10_000
assertMaintenanceLeaseTiming(LEASE_TTL_MS, LEASE_RENEW_INTERVAL_MS)

const renewScript = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('pexpire', KEYS[1], ARGV[2])
    end
    return 0
`

const releaseScript = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    end
    return 0
`

export type MaintenanceLease = {
    assertHeld: () => void
}

type HeldMaintenanceLease = MaintenanceLease & {
    release: () => Promise<void>
}

function createLeaseLostError() {
    return new Error('Maintenance lease was lost before the cycle completed.')
}

async function acquireRedisLease(): Promise<HeldMaintenanceLease | null> {
    const client = getRedisClient()
    const token = randomUUID()
    const acquired = await client.set(
        MAINTENANCE_LOCK_NAME,
        token,
        'PX',
        LEASE_TTL_MS,
        'NX',
    )

    if (acquired !== 'OK') {
        return null
    }

    let lost = false
    let renewing = false
    const renewInterval = setInterval(() => {
        if (renewing || lost) return
        renewing = true
        void client.eval(
            renewScript,
            1,
            MAINTENANCE_LOCK_NAME,
            token,
            String(LEASE_TTL_MS),
        ).then((result) => {
            if (Number(result) !== 1) {
                lost = true
                clearInterval(renewInterval)
            }
        }).catch((error: unknown) => {
            lost = true
            clearInterval(renewInterval)
            logError('Failed to renew maintenance lease', error, {
                operation: 'maintenance-lease-renew',
            })
        }).finally(() => {
            renewing = false
        })
    }, LEASE_RENEW_INTERVAL_MS)
    renewInterval.unref()

    return {
        assertHeld() {
            if (lost) throw createLeaseLostError()
        },
        async release() {
            clearInterval(renewInterval)
            try {
                await client.eval(
                    releaseScript,
                    1,
                    MAINTENANCE_LOCK_NAME,
                    token,
                )
            } catch (error: unknown) {
                logError('Failed to release maintenance lease', error, {
                    operation: 'maintenance-lease-release',
                })
            }
        },
    }
}

async function acquirePostgresAdvisoryLease(): Promise<HeldMaintenanceLease | null> {
    const queryRunner = AppDataSource.createQueryRunner()
    await queryRunner.connect()

    try {
        const rows = await queryRunner.query(
            'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
            [MAINTENANCE_LOCK_NAME],
        ) as Array<{ locked: boolean }>

        if (!rows[0]?.locked) {
            await queryRunner.release()
            return null
        }

        return {
            assertHeld() {},
            async release() {
                try {
                    await queryRunner.query(
                        'SELECT pg_advisory_unlock(hashtext($1))',
                        [MAINTENANCE_LOCK_NAME],
                    )
                } finally {
                    await queryRunner.release()
                }
            },
        }
    } catch (error) {
        await queryRunner.release()
        throw error
    }
}

async function acquireMaintenanceLease() {
    let redisLease: HeldMaintenanceLease | null = null

    if (isRedisEnabled()) {
        try {
            redisLease = await acquireRedisLease()
            if (!redisLease) return null
        } catch (error: unknown) {
            logError('Redis maintenance lease unavailable; using PostgreSQL safety lock', error, {
                operation: 'maintenance-lease-fallback',
            })
        }
    }

    try {
        const postgresLease = await acquirePostgresAdvisoryLease()
        if (!postgresLease) {
            await redisLease?.release()
            return null
        }

        return {
            assertHeld() {
                postgresLease.assertHeld()
                redisLease?.assertHeld()
            },
            async release() {
                try {
                    await redisLease?.release()
                } finally {
                    await postgresLease.release()
                }
            },
        }
    } catch (error) {
        await redisLease?.release()
        throw error
    }
}

export async function withMaintenanceLease<T>(
    task: (lease: MaintenanceLease) => Promise<T>,
) {
    const lease = await acquireMaintenanceLease()
    if (!lease) return null

    try {
        return await task(lease)
    } finally {
        await lease.release()
    }
}
