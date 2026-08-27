export const REDIS_RATE_LIMIT_FAILURE_MODES = ['fail-open', 'fail-closed'] as const

export type RedisRateLimitFailureMode = (typeof REDIS_RATE_LIMIT_FAILURE_MODES)[number]

/**
 * Resolves the behaviour used when the distributed Redis limiter is
 * unavailable. Production must never silently fall back to a process-local
 * bucket because that would allow a caller to bypass limits by switching
 * replicas. Development and tests may opt into fail-open for local work.
 */
export function resolveRedisRateLimitFailureMode(
    nodeEnv: string,
    configuredMode?: string,
): RedisRateLimitFailureMode {
    const normalized = configuredMode?.trim().toLowerCase()
    const mode = normalized || (nodeEnv === 'production' ? 'fail-closed' : 'fail-open')

    if (!REDIS_RATE_LIMIT_FAILURE_MODES.includes(mode as RedisRateLimitFailureMode)) {
        throw new Error(
            `REDIS_RATE_LIMIT_FAILURE_MODE must be one of: ${REDIS_RATE_LIMIT_FAILURE_MODES.join(', ')}.`,
        )
    }

    if (nodeEnv === 'production' && mode !== 'fail-closed') {
        throw new Error('Production requires REDIS_RATE_LIMIT_FAILURE_MODE=fail-closed.')
    }

    return mode as RedisRateLimitFailureMode
}
