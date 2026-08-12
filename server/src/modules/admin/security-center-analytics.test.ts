import { describe, expect, it } from 'vitest'

import {
    buildSecurityCenterAnalytics,
    REQUEST_BURST_THRESHOLD,
} from './security-center-analytics.js'
import {
    SecurityEventRateLimitResult,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'

describe('Security Center analytics', () => {
    it('calculates bounded attack indicators without retaining raw user-agent strings', () => {
        const events = Array.from({ length: REQUEST_BURST_THRESHOLD }, (_, index) => ({
            createdAt: `2026-08-08T10:20:${String(index).padStart(2, '0')}.000Z`,
            ipAddress: '192.0.2.10',
            userId: index === 0 ? 'user-1' : null,
            type: SecurityEventType.LoginFailed,
            failedLoginAttempts: 2,
            userAgent: 'Mozilla/5.0 Chrome/123.0.0.0',
            rateLimitResult: index === 0
                ? SecurityEventRateLimitResult.Blocked
                : SecurityEventRateLimitResult.Allowed,
        }))

        expect(buildSecurityCenterAnalytics(events)).toMatchObject({
            uniqueIpCount: 1,
            affectedAccountCount: 1,
            repeatedFailedLoginCount: REQUEST_BURST_THRESHOLD,
            requestBursts: [{ windowStart: '2026-08-08T10:20:00.000Z', count: REQUEST_BURST_THRESHOLD }],
            topUserAgents: [{ userAgent: 'Mozilla/# Chrome/#', count: REQUEST_BURST_THRESHOLD }],
            rateLimitEffectiveness: {
                blocked: 1,
                allowed: REQUEST_BURST_THRESHOLD - 1,
                notChecked: 0,
                blockedSharePercent: Math.round(100 / REQUEST_BURST_THRESHOLD),
            },
        })
    })

    it('does not report bursts below the threshold and handles empty data', () => {
        expect(buildSecurityCenterAnalytics([{
            createdAt: '2026-08-08T10:20:00.000Z',
            ipAddress: null,
            userId: null,
            type: SecurityEventType.RouteScan,
            failedLoginAttempts: null,
            userAgent: null,
            rateLimitResult: SecurityEventRateLimitResult.NotChecked,
        }])).toMatchObject({
            uniqueIpCount: 0,
            affectedAccountCount: 0,
            repeatedFailedLoginCount: 0,
            requestBursts: [],
            topUserAgents: [],
            rateLimitEffectiveness: {
                blocked: 0,
                allowed: 0,
                notChecked: 1,
                blockedSharePercent: 0,
            },
        })
    })
})
