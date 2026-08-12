import { SecurityEventRateLimitResult, SecurityEventType } from '../../entities/security-event/security-event.entity.js'

export type SecurityAnalyticsEvent = {
    createdAt: string
    ipAddress: string | null
    userId: string | null
    type: SecurityEventType
    failedLoginAttempts: number | null
    userAgent: string | null
    rateLimitResult: SecurityEventRateLimitResult
}

export type SecurityCenterAnalytics = {
    uniqueIpCount: number
    affectedAccountCount: number
    repeatedFailedLoginCount: number
    requestBursts: Array<{ windowStart: string; count: number }>
    topUserAgents: Array<{ userAgent: string; count: number }>
    rateLimitEffectiveness: {
        blocked: number
        allowed: number
        notChecked: number
        blockedSharePercent: number
    }
}

export const REQUEST_BURST_THRESHOLD = 5

function countEntries<T extends string>(values: readonly T[]) {
    const counts = new Map<T, number>()
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
    return [...counts.entries()]
        .sort(([, left], [, right]) => right - left)
        .map(([value, count]) => ({ value, count }))
}

function toUserAgentPattern(value: string) {
    return value
        .trim()
        .replace(/\d+(?:\.\d+)+/g, '#')
        .split(/\s+/)
        .slice(0, 2)
        .join(' ')
        .slice(0, 96)
}

function toMinuteBucket(value: string) {
    const timestamp = new Date(value)
    timestamp.setUTCSeconds(0, 0)
    return timestamp.toISOString()
}

export function buildSecurityCenterAnalytics(
    events: readonly SecurityAnalyticsEvent[],
): SecurityCenterAnalytics {
    const ipSet = new Set<string>()
    const accountSet = new Set<string>()
    const burstBuckets = new Map<string, number>()
    const userAgents: string[] = []
    let repeatedFailedLoginCount = 0
    let blocked = 0
    let allowed = 0
    let notChecked = 0

    for (const event of events) {
        if (event.ipAddress) ipSet.add(event.ipAddress)
        if (event.userId) accountSet.add(event.userId)
        if (event.type === SecurityEventType.LoginFailed && (event.failedLoginAttempts ?? 0) > 1) {
            repeatedFailedLoginCount += 1
        }

        if (event.createdAt) {
            const bucket = toMinuteBucket(event.createdAt)
            burstBuckets.set(bucket, (burstBuckets.get(bucket) ?? 0) + 1)
        }
        if (event.userAgent) {
            const pattern = toUserAgentPattern(event.userAgent)
            if (pattern) userAgents.push(pattern)
        }

        if (event.rateLimitResult === SecurityEventRateLimitResult.Blocked) blocked += 1
        else if (event.rateLimitResult === SecurityEventRateLimitResult.Allowed) allowed += 1
        else notChecked += 1
    }

    const rateLimitedRequests = blocked + allowed

    return {
        uniqueIpCount: ipSet.size,
        affectedAccountCount: accountSet.size,
        repeatedFailedLoginCount,
        requestBursts: [...burstBuckets.entries()]
            .filter(([, count]) => count >= REQUEST_BURST_THRESHOLD)
            .sort(([, left], [, right]) => right - left)
            .slice(0, 8)
            .map(([windowStart, count]) => ({ windowStart, count })),
        topUserAgents: countEntries(userAgents)
            .slice(0, 8)
            .map(({ value, count }) => ({ userAgent: value, count })),
        rateLimitEffectiveness: {
            blocked,
            allowed,
            notChecked,
            blockedSharePercent: rateLimitedRequests === 0
                ? 0
                : Math.round((blocked / rateLimitedRequests) * 100),
        },
    }
}
