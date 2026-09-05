import { BookingStatus } from '../../entities/booking/booking.entity.js'
import { metrics, type MetricsRegistry } from '../../shared/observability/metrics.js'

export const ownerActionCenterEventNames = [
    'pending_bookings',
    'reschedule_requests',
    'draft_cabinets',
    'blocked_cabinets',
    'readiness',
] as const

export type OwnerActionCenterEventName = typeof ownerActionCenterEventNames[number]

export function normalizeOwnerActionCenterEvent(value: unknown): OwnerActionCenterEventName | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return ownerActionCenterEventNames.includes(normalized as OwnerActionCenterEventName)
        ? normalized as OwnerActionCenterEventName
        : null
}

type MetricWriter = Pick<MetricsRegistry, 'increment' | 'observe' | 'setGauge'>

type RecordBookingDecisionInput = {
    previousStatus: BookingStatus
    nextStatus: BookingStatus
    createdAt: Date
    resolvedAt?: Date
}

type RecordRescheduleDecisionInput = {
    decision: 'accepted' | 'rejected'
    createdAt: Date
    resolvedAt?: Date
}

type RecordQueueSnapshotInput = {
    pendingBookings: number
    pendingReschedules: number
    pendingBookingsOlderThan24Hours: number
    pendingReschedulesOlderThan24Hours: number
}

const MAX_OWNER_ACTION_AGE_MS = 31 * 24 * 60 * 60 * 1000
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

function getBoundedAgeMs(createdAt: Date, resolvedAt: Date) {
    const age = resolvedAt.getTime() - createdAt.getTime()

    if (!Number.isFinite(age)) {
        return null
    }

    return Math.min(Math.max(age, 0), MAX_OWNER_ACTION_AGE_MS)
}

function getBoundedCount(value: number) {
    if (!Number.isFinite(value)) {
        return 0
    }

    return Math.min(Math.max(Math.trunc(value), 0), 100)
}

export function recordOwnerActionCenterClick(
    action: OwnerActionCenterEventName,
    registry: MetricWriter = metrics,
) {
    registry.increment('owner_action_center_clicks_total', 1, { action })
}

export function recordOwnerBookingDecision(
    input: RecordBookingDecisionInput,
    registry: MetricWriter = metrics,
) {
    if (input.previousStatus !== BookingStatus.Pending) {
        return
    }

    const outcome = input.nextStatus === BookingStatus.Confirmed
        ? 'confirmed'
        : input.nextStatus === BookingStatus.Cancelled
            ? 'cancelled'
            : null

    if (!outcome) {
        return
    }

    const resolvedAt = input.resolvedAt ?? new Date()
    const ageMs = getBoundedAgeMs(input.createdAt, resolvedAt)

    registry.increment('owner_booking_decisions_total', 1, { outcome })

    if (ageMs !== null) {
        registry.observe('owner_booking_decision_latency_ms', ageMs, { outcome })
    }
}

export function recordOwnerRescheduleDecision(
    input: RecordRescheduleDecisionInput,
    registry: MetricWriter = metrics,
) {
    const resolvedAt = input.resolvedAt ?? new Date()
    const ageMs = getBoundedAgeMs(input.createdAt, resolvedAt)

    registry.increment('owner_reschedule_decisions_total', 1, { outcome: input.decision })

    if (ageMs !== null) {
        registry.observe('owner_reschedule_decision_latency_ms', ageMs, { outcome: input.decision })
    }
}

export function recordOwnerActionQueueSnapshot(
    input: RecordQueueSnapshotInput,
    registry: MetricWriter = metrics,
) {
    registry.setGauge('owner_action_queue_items', getBoundedCount(input.pendingBookings), { queue: 'pending_bookings' })
    registry.setGauge('owner_action_queue_items', getBoundedCount(input.pendingReschedules), { queue: 'reschedule_requests' })
    registry.setGauge('owner_action_queue_older_than_24h', getBoundedCount(input.pendingBookingsOlderThan24Hours), { queue: 'pending_bookings' })
    registry.setGauge('owner_action_queue_older_than_24h', getBoundedCount(input.pendingReschedulesOlderThan24Hours), { queue: 'reschedule_requests' })
}

export { DAY_IN_MILLISECONDS }
