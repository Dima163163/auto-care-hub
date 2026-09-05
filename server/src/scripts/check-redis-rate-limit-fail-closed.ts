import { fileURLToPath } from 'node:url'

import { env } from '../config/env.js'
import { getRedisClient, disconnectRedis } from '../shared/redis/redis.js'

export const MAX_REDIS_PROBE_TIMEOUT_MS = 10_000

export type RedisProbeStatus = 'pass' | 'skipped' | 'blocked'

export type RedisProbeReport = {
    schemaVersion: 1
    status: RedisProbeStatus
    mode: string
    timeoutMs: number
    message: string
}

export function parseRedisProbeOptions(argv: readonly string[] = process.argv.slice(2), environment: NodeJS.ProcessEnv = process.env) {
    const configured = Number(environment.REDIS_PROBE_TIMEOUT_MS ?? 5_000)
    if (!Number.isSafeInteger(configured) || configured < 250 || configured > MAX_REDIS_PROBE_TIMEOUT_MS) {
        throw new Error(`REDIS_PROBE_TIMEOUT_MS must be an integer between 250 and ${MAX_REDIS_PROBE_TIMEOUT_MS}.`)
    }
    return { json: argv.includes('--json'), timeoutMs: configured }
}

export function redactRedisProbeError(error: unknown) {
    return String(error instanceof Error ? error.message : error || 'Redis health check failed.')
        .replace(/redis:\/\/[^\s]+/gi, 'redis://[REDACTED]')
        .replace(/(password|secret|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
}

export async function pingRedisWithTimeout(
    ping: () => Promise<unknown>,
    timeoutMs: number,
) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > MAX_REDIS_PROBE_TIMEOUT_MS) {
        throw new Error(`Redis probe timeout must be between 250 and ${MAX_REDIS_PROBE_TIMEOUT_MS} ms.`)
    }
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            ping(),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(Object.assign(new Error('Redis health check timed out.'), { code: 'REDIS_TIMEOUT' })), timeoutMs)
                timeout.unref?.()
            }),
        ])
    } finally {
        if (timeout) clearTimeout(timeout)
    }
}

export async function runRedisFailClosedCheck(options: { timeoutMs?: number; redisClient?: { ping: () => Promise<unknown> } } = {}): Promise<RedisProbeReport> {
    const timeoutMs = options.timeoutMs ?? 5_000
    if (env.redis.rateLimitFailureMode !== 'fail-closed') {
        if (env.nodeEnv === 'production') throw new Error('Production Redis rate limiting must use fail-closed mode.')
        return { schemaVersion: 1, status: 'skipped', mode: env.redis.rateLimitFailureMode, timeoutMs, message: `${env.nodeEnv} mode is not fail-closed; production rehearsal skipped.` }
    }
    if (!env.redis.enabled) throw new Error('Fail-closed Redis rehearsal requires Redis to be enabled.')
    const redis = options.redisClient ?? getRedisClient()
    await pingRedisWithTimeout(() => redis.ping(), timeoutMs)
    return { schemaVersion: 1, status: 'pass', mode: 'fail-closed', timeoutMs, message: 'distributed limiter is reachable and configured fail-closed.' }
}

async function main() {
    const { json, timeoutMs } = parseRedisProbeOptions()
    try {
        const report = await runRedisFailClosedCheck({ timeoutMs })
        if (json) console.log(JSON.stringify(report))
        else console.log(`[redis-rate-limit] ${report.message}`)
    } catch (error: unknown) {
        const report: RedisProbeReport = { schemaVersion: 1, status: 'blocked', mode: env.redis.rateLimitFailureMode, timeoutMs, message: redactRedisProbeError(error) }
        if (json) console.error(JSON.stringify(report))
        else console.error(report.message)
        process.exitCode = 1
    } finally {
        await disconnectRedis().catch(() => undefined)
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
