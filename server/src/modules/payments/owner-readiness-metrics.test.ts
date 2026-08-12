import { describe, expect, it } from 'vitest'

import { MetricsRegistry } from '../../shared/observability/metrics.js'
import type { OwnerReadiness } from './owner-readiness.service.js'
import {
    recordOwnerCheckoutBlockedMetric,
    recordOwnerReadinessMetrics,
} from './owner-readiness-metrics.js'

const blockedReadiness: OwnerReadiness = {
    ready: false,
    blockers: ['email_verification', 'payout_account'],
    checks: {
        emailVerified: false,
        activeCabinet: true,
        activeService: true,
        scheduleConfigured: true,
        payoutAccount: 'pending',
    },
}

describe('owner readiness metrics', () => {
    it('records bounded readiness, Connect, and blocker dimensions', () => {
        const registry = new MetricsRegistry()

        recordOwnerReadinessMetrics(blockedReadiness, registry)

        expect(registry.snapshot().counters).toEqual(expect.arrayContaining([
            {
                name: 'owner_readiness_checks_total',
                labels: { outcome: 'blocked' },
                value: 1,
            },
            {
                name: 'owner_connect_readiness_total',
                labels: { status: 'pending' },
                value: 1,
            },
            {
                name: 'owner_readiness_blockers_total',
                labels: { blocker: 'email_verification' },
                value: 1,
            },
            {
                name: 'owner_readiness_blockers_total',
                labels: { blocker: 'payout_account' },
                value: 1,
            },
        ]))
    })

    it('records checkout readiness failures without personal or provider labels', () => {
        const registry = new MetricsRegistry()

        recordOwnerCheckoutBlockedMetric(registry)

        expect(registry.snapshot().counters).toEqual([{
            name: 'owner_checkout_blocked_total',
            labels: { reason: 'owner_readiness' },
            value: 1,
        }])
    })
})
