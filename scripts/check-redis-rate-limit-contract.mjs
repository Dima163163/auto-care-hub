import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

const CHECKS = [
    ['JSON summary', 'server/src/scripts/check-redis-rate-limit-fail-closed.ts', ['schemaVersion: 1', "argv.includes('--json')", "export type RedisProbeStatus = 'pass' | 'skipped' | 'blocked'"]],
    ['Bounded ping', 'server/src/scripts/check-redis-rate-limit-fail-closed.ts', ['MAX_REDIS_PROBE_TIMEOUT_MS', 'pingRedisWithTimeout', 'REDIS_TIMEOUT', 'clearTimeout']],
    ['Deterministic fake outage/reconnect', 'server/src/scripts/redis-rate-limit-fakes.ts', ['DeterministicFakeRedisAdapter', "'ready' | 'outage'", 'synthetic Redis outage']],
    ['Production fail-closed boundary', 'server/src/shared/security/rate-limit.ts', ['mustFailClosedForRedisRateLimitFailure', 'not a security boundary in a multi-replica', 'checkRateLimit(identifier, options)']],
    ['Recovery regression', 'server/src/scripts/redis-rate-limit-fakes.test.ts', ['outage', 'ready', 'pings', 'REDIS_TIMEOUT']],
]

export async function evaluateRedisRateLimitContract(root = ROOT) {
    const results = []
    for (const [name, file, fragments] of CHECKS) {
        const source = await readFile(resolve(root, file), 'utf8').catch(() => '')
        const missing = fragments.filter((fragment) => !source.includes(fragment))
        results.push(missing.length === 0
            ? { name, status: 'pass', detail: `${file} contains the required controls` }
            : { name, status: 'blocked', detail: `${file}: missing ${missing.join('; ')}` })
    }
    return results
}

async function main() {
    const results = await evaluateRedisRateLimitContract()
    console.log(['Redis fail-closed contract', ...results.map((result) => `[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)].join('\n'))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
