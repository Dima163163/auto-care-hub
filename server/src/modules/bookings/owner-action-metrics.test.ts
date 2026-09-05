import { describe, expect, it } from 'vitest'

import { BookingStatus } from '../../entities/booking/booking.entity.js'
import { MetricsRegistry } from '../../shared/observability/metrics.js'
import {
    recordOwnerActionCenterClick,
    recordOwnerActionQueueSnapshot,
    recordOwnerBookingDecision,
    recordOwnerRescheduleDecision,
    normalizeOwnerActionCenterEvent,
} from './owner-action-metrics.js'

const createdAt = new Date('2026-08-01T10:00:00.000Z')
const resolvedAt = new Date('2026-08-02T10:30:00.000Z')

describe('owner action metrics', () => {
    it('normalizes only known action-center events', () => {
        expect(normalizeOwnerActionCenterEvent(' pending_bookings ')).toBe('pending_bookings')
        expect(normalizeOwnerActionCenterEvent('unknown')).toBeNull()
        expect(normalizeOwnerActionCenterEvent({ unsafe: true })).toBeNull()
    })

    it('records bounded action clicks and queue snapshots without identity labels', () => {
        const registry = new MetricsRegistry()

        recordOwnerActionCenterClick('pending_bookings', registry)
        recordOwnerActionQueueSnapshot({
            pendingBookings: 150,
            pendingReschedules: 2,
            pendingBookingsOlderThan24Hours: 4,
            pendingReschedulesOlderThan24Hours: 1,
        }, registry)

        expect(registry.snapshot().counters).toEqual([{
            name: 'owner_action_center_clicks_total',
            labels: { action: 'pending_bookings' },
            value: 1,
        }])
        expect(registry.snapshot().gauges).toEqual(expect.arrayContaining([
            { name: 'owner_action_queue_items', labels: { queue: 'pending_bookings' }, value: 100 },
            { name: 'owner_action_queue_items', labels: { queue: 'reschedule_requests' }, value: 2 },
            { name: 'owner_action_queue_older_than_24h', labels: { queue: 'pending_bookings' }, value: 4 },
            { name: 'owner_action_queue_older_than_24h', labels: { queue: 'reschedule_requests' }, value: 1 },
        ]))
    })

    it('records booking and reschedule decision latency by bounded outcome', () => {
        const registry = new MetricsRegistry()

        recordOwnerBookingDecision({
            previousStatus: BookingStatus.Pending,
            nextStatus: BookingStatus.Confirmed,
            createdAt,
            resolvedAt,
        }, registry)
        recordOwnerRescheduleDecision({
            decision: 'rejected',
            createdAt,
            resolvedAt,
        }, registry)

        expect(registry.snapshot().counters).toEqual(expect.arrayContaining([
            { name: 'owner_booking_decisions_total', labels: { outcome: 'confirmed' }, value: 1 },
            { name: 'owner_reschedule_decisions_total', labels: { outcome: 'rejected' }, value: 1 },
        ]))
        expect(registry.snapshot().histograms).toEqual(expect.arrayContaining([
            {
                name: 'owner_booking_decision_latency_ms',
                labels: { outcome: 'confirmed' },
                count: 1,
                sum: 88_200_000,
                max: 88_200_000,
            },
            {
                name: 'owner_reschedule_decision_latency_ms',
                labels: { outcome: 'rejected' },
                count: 1,
                sum: 88_200_000,
                max: 88_200_000,
            },
        ]))
    })

    it('ignores non-decisions and does not expose future timestamps as negative latency', () => {
        const registry = new MetricsRegistry()

        recordOwnerBookingDecision({
            previousStatus: BookingStatus.Confirmed,
            nextStatus: BookingStatus.Cancelled,
            createdAt,
            resolvedAt,
        }, registry)
        recordOwnerBookingDecision({
            previousStatus: BookingStatus.Pending,
            nextStatus: BookingStatus.Confirmed,
            createdAt: resolvedAt,
            resolvedAt: createdAt,
        }, registry)

        expect(registry.snapshot().counters).toEqual([{
            name: 'owner_booking_decisions_total',
            labels: { outcome: 'confirmed' },
            value: 1,
        }])
        expect(registry.snapshot().histograms).toEqual([{
            name: 'owner_booking_decision_latency_ms',
            labels: { outcome: 'confirmed' },
            count: 1,
            sum: 0,
            max: 0,
        }])
    })
})
