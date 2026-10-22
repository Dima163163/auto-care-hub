import { env } from '../../config/env.js'

const UNIT_SECONDS: Record<string, number> = {
    s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
    m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
    h: 3_600, hr: 3_600, hrs: 3_600, hour: 3_600, hours: 3_600,
    d: 86_400, day: 86_400, days: 86_400,
    w: 604_800, week: 604_800, weeks: 604_800,
}
const MAX_REFRESH_TTL_SECONDS = 365 * 86_400

export function parseRefreshSessionTtlSeconds(value: string | number) {
    const seconds = typeof value === 'number'
        ? value
        : (() => {
            const match = /^([1-9][0-9]*)\s*([a-z]+)$/i.exec(value.trim())
            return match ? Number(match[1]) * (UNIT_SECONDS[match[2]!.toLowerCase()] ?? NaN) : NaN
        })()
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > MAX_REFRESH_TTL_SECONDS) {
        throw new Error('JWT_REFRESH_EXPIRES_IN must be a positive duration of at most 365 days (s, m, h, d or w).')
    }
    return seconds
}

export function calculateRefreshSessionExpiry(value: string | number, now = new Date()) {
    return new Date(now.getTime() + parseRefreshSessionTtlSeconds(value) * 1_000)
}

/** Refresh sessions have an absolute lifetime measured from their creation. */
export function getRefreshSessionExpiry(now = new Date()) {
    const configured = env.auth.jwtRefreshExpiresIn
    if (configured === undefined) throw new Error('JWT_REFRESH_EXPIRES_IN is missing.')
    return calculateRefreshSessionExpiry(configured, now)
}
