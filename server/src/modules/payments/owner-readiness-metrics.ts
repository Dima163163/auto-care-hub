import { metrics, type MetricsRegistry } from '../../shared/observability/metrics.js'
import type { OwnerReadiness } from './owner-readiness.service.js'

type MetricWriter = Pick<MetricsRegistry, 'increment'>

/**
 * Records only bounded readiness dimensions. Owner IDs, emails, Stripe IDs,
 * and provider error details must never become metric labels.
 */
export function recordOwnerReadinessMetrics(
    readiness: OwnerReadiness,
    registry: MetricWriter = metrics,
) {
    registry.increment('owner_readiness_checks_total', 1, {
        outcome: readiness.ready ? 'ready' : 'blocked',
    })
    registry.increment('owner_connect_readiness_total', 1, {
        status: readiness.checks.payoutAccount,
    })

    for (const blocker of readiness.blockers) {
        registry.increment('owner_readiness_blockers_total', 1, { blocker })
    }
}

export function recordOwnerCheckoutBlockedMetric(registry: MetricWriter = metrics) {
    registry.increment('owner_checkout_blocked_total', 1, { reason: 'owner_readiness' })
}
