import { beforeEach, describe, expect, it } from 'vitest'

import { MetricsRegistry } from './metrics.js'

describe('metrics registry', () => {
    const registry = new MetricsRegistry()

    beforeEach(() => {
        registry.reset()
    })

    it('aggregates counters by metric name and normalized labels', () => {
        registry.increment('api_requests_total', 2, { method: 'GET', route: '/health' })
        registry.increment('api_requests_total', 3, { route: '/health', method: 'GET' })

        expect(registry.snapshot().counters).toEqual([{
            name: 'api_requests_total',
            labels: { method: 'GET', route: '/health' },
            value: 5,
        }])
    })

    it('tracks histogram count, sum, and maximum', () => {
        registry.observe('api_request_duration_ms', 12)
        registry.observe('api_request_duration_ms', 8)

        expect(registry.snapshot().histograms).toEqual([{
            name: 'api_request_duration_ms',
            labels: {},
            count: 2,
            sum: 20,
            max: 12,
        }])
    })

    it('replaces gauges instead of accumulating them', () => {
        registry.setGauge('outbox_pending', 4)
        registry.setGauge('outbox_pending', 2)

        expect(registry.snapshot().gauges).toEqual([{
            name: 'outbox_pending',
            labels: {},
            value: 2,
        }])
    })

    it('ignores invalid metric values', () => {
        registry.increment('counter', 0)
        registry.observe('histogram', -1)

        expect(registry.snapshot()).toEqual({ gauges: [], counters: [], histograms: [] })
    })

    it('bounds unique label series per metric name', () => {
        const boundedRegistry = new MetricsRegistry({ maxSeriesPerMetric: 2 })

        boundedRegistry.increment('api_requests_total', 1, { route: '/one' })
        boundedRegistry.increment('api_requests_total', 1, { route: '/two' })
        boundedRegistry.increment('api_requests_total', 1, { route: '/three' })
        boundedRegistry.increment('api_requests_total', 1, { route: '/one' })

        expect(boundedRegistry.snapshot().counters).toEqual([
            {
                name: 'api_requests_total',
                labels: { route: '/one' },
                value: 2,
            },
            {
                name: 'api_requests_total',
                labels: { route: '/two' },
                value: 1,
            },
        ])
    })

    it('releases the series budget when the registry is reset', () => {
        const boundedRegistry = new MetricsRegistry({ maxSeriesPerMetric: 1 })

        boundedRegistry.increment('worker_runs_total', 1, { worker: 'first' })
        boundedRegistry.reset()
        boundedRegistry.increment('worker_runs_total', 1, { worker: 'second' })

        expect(boundedRegistry.snapshot().counters).toEqual([{
            name: 'worker_runs_total',
            labels: { worker: 'second' },
            value: 1,
        }])
    })
})
