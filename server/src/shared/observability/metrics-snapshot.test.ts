import { describe, expect, it } from 'vitest'

import { getBoundedMetricsSnapshot } from './metrics.js'

describe('metrics snapshot bounds', () => {
    it('limits the exported series count across metric families', () => {
        const snapshot = {
            gauges: [{ name: 'gauge', labels: {}, value: 1 }],
            counters: [{ name: 'counter', labels: {}, value: 1 }],
            histograms: [{ name: 'histogram', labels: {}, count: 1, sum: 1, max: 1 }],
        }

        const bounded = getBoundedMetricsSnapshot(snapshot, 2)
        expect(bounded.gauges).toHaveLength(1)
        expect(bounded.counters).toHaveLength(1)
        expect(bounded.histograms).toHaveLength(0)
    })
})
