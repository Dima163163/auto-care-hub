import { AppDataSource } from './data-source.js'

export type DatabasePoolStats = {
    total: number
    idle: number
    active: number
    waiting: number
}

type PgPoolLike = {
    totalCount?: unknown
    idleCount?: unknown
    waitingCount?: unknown
}

let disconnectPromise: Promise<void> | null = null

function isFiniteNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function readDatabasePoolStats(pool: PgPoolLike | null | undefined): DatabasePoolStats | null {
    if (
        !isFiniteNonNegativeInteger(pool?.totalCount) ||
        !isFiniteNonNegativeInteger(pool?.idleCount) ||
        !isFiniteNonNegativeInteger(pool?.waitingCount)
    ) {
        return null
    }

    const active = pool.totalCount - pool.idleCount
    if (active < 0) return null

    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        active,
        waiting: pool.waitingCount,
    }
}

export async function connectDatabase() {
    if (AppDataSource.isInitialized) {
        return AppDataSource
    }

    await AppDataSource.initialize()

    return AppDataSource
}

export async function disconnectDatabaseGracefully() {
    if (disconnectPromise) {
        return disconnectPromise
    }

    if (!AppDataSource.isInitialized) {
        return
    }

    disconnectPromise = AppDataSource.destroy().finally(() => {
        disconnectPromise = null
    })

    return disconnectPromise
}

export async function disconnectDatabase() {
    await disconnectDatabaseGracefully()
}

export function isDatabaseConnected() {
    return AppDataSource.isInitialized
}

export function getDatabasePoolStats() {
    if (!AppDataSource.isInitialized) return null

    const driver = AppDataSource.driver as unknown as { master?: PgPoolLike }
    return readDatabasePoolStats(driver.master)
}
