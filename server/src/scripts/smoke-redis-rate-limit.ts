import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { env } from '../config/env.js'
import { checkRateLimitRedis, type RateLimitResult } from '../shared/security/rate-limit.js'
import { disconnectRedis, getRedisClient, isRedisEnabled } from '../shared/redis/redis.js'

const [, , mode, scope, identifier] = process.argv
const timeoutMs = 8_000

export type RedisRateLimitWorkerResult = Pick<RateLimitResult, 'allowed' | 'remaining'>

export type RedisRateLimitSmokeReport = {
    schemaVersion: 1
    status: 'pass'
    processCount: number
    allowedCount: number
    deniedCount: number
}

export function summarizeRedisRateLimitResults(
    results: readonly RedisRateLimitWorkerResult[],
): RedisRateLimitSmokeReport {
    const allowedCount = results.filter((result) => result.allowed).length
    const deniedCount = results.filter((result) => !result.allowed).length

    if (results.length !== 2 || allowedCount !== 1 || deniedCount !== 1) {
        throw new Error('Distributed Redis limiter did not produce exactly one allowed and one denied result.')
    }

    return {
        schemaVersion: 1,
        status: 'pass',
        processCount: results.length,
        allowedCount,
        deniedCount,
    }
}

function parseWorkerResult(line: string): RedisRateLimitWorkerResult {
    const parsed: unknown = JSON.parse(line)

    if (
        typeof parsed !== 'object'
        || parsed === null
        || typeof (parsed as { allowed?: unknown }).allowed !== 'boolean'
        || typeof (parsed as { remaining?: unknown }).remaining !== 'number'
    ) {
        throw new Error('Redis limiter worker returned an invalid result.')
    }

    return parsed as RedisRateLimitWorkerResult
}

async function runWorker() {
    if (!scope || !identifier) throw new Error('Redis limiter worker requires a scope and identifier.')

    try {
        const result = await checkRateLimitRedis(`ip:${identifier}`, {
            maxRequests: 1,
            scope,
            windowMs: 10_000,
        })

        process.stdout.write(`RESULT:${JSON.stringify({ allowed: result.allowed, remaining: result.remaining })}\n`)
    } finally {
        await disconnectRedis()
    }
}

function spawnWorker(workerScope: string, workerIdentifier: string) {
    const scriptPath = fileURLToPath(import.meta.url)
    const scriptArgs = scriptPath.endsWith('.ts')
        ? ['--import', 'tsx', scriptPath, 'worker', workerScope, workerIdentifier]
        : [scriptPath, 'worker', workerScope, workerIdentifier]
    const child = spawn(process.execPath, scriptArgs, {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
    })

    return new Promise<RedisRateLimitWorkerResult>((resolve, reject) => {
        let stdout = ''
        let settled = false
        const timeout = setTimeout(() => {
            settle(() => {
                if (!child.killed) child.kill('SIGTERM')
                reject(new Error('Redis limiter worker timed out.'))
            })
        }, timeoutMs)

        const settle = (callback: () => void) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            callback()
        }

        child.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString()
        })
        child.once('error', () => settle(() => reject(new Error('Redis limiter worker could not start.'))))
        child.once('exit', (code, signal) => {
            settle(() => {
                if (code !== 0) {
                    reject(new Error(`Redis limiter worker exited unexpectedly (${code ?? signal ?? 'unknown'}).`))
                    return
                }

                const resultLine = stdout.split('\n').find((line) => line.startsWith('RESULT:'))
                if (!resultLine) {
                    reject(new Error('Redis limiter worker produced no result.'))
                    return
                }

                try {
                    resolve(parseWorkerResult(resultLine.slice('RESULT:'.length)))
                } catch {
                    reject(new Error('Redis limiter worker result could not be parsed.'))
                }
            })
        })
    })
}

async function runCoordinator() {
    if (!isRedisEnabled()) throw new Error('Redis is not enabled; set REDIS_HOST or REDIS_URL before running this smoke check.')
    if (env.redis.rateLimitFailureMode !== 'fail-closed') throw new Error('Redis multi-process smoke requires fail-closed mode.')

    const smokeScope = `smoke-multiprocess-${randomUUID()}`
    const smokeIdentifier = randomUUID()
    const redisKey = `ratelimit:${smokeScope}:ip:${smokeIdentifier}`
    const redis = getRedisClient()

    await redis.del(redisKey)
    try {
        const results = await Promise.all([
            spawnWorker(smokeScope, smokeIdentifier),
            spawnWorker(smokeScope, smokeIdentifier),
        ])
        console.log(JSON.stringify(summarizeRedisRateLimitResults(results)))
    } finally {
        await redis.del(redisKey)
        await disconnectRedis()
    }
}

async function main() {
    if (mode === 'worker') await runWorker()
    else await runCoordinator()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    void main().catch((error: unknown) => {
        process.stderr.write(`${error instanceof Error ? error.message : 'Redis limiter smoke check failed.'}\n`)
        process.exitCode = 1
    })
}
