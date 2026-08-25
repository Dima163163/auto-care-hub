import { describe, expect, it } from 'vitest'

import { isDiscoveryBenchmarkWithinBudget, summarizeDiscoveryBenchmark } from './discovery-benchmark.js'

describe('discovery benchmark summary', () => {
    it('reports deterministic percentiles and applies a p95 release budget', () => {
        const summary = summarizeDiscoveryBenchmark([
            { durationMs: 10 }, { durationMs: 20 }, { durationMs: 30 }, { durationMs: 40 }, { durationMs: 50 },
        ])

        expect(summary).toEqual({ samples: 5, p50Ms: 30, p95Ms: 50, maxMs: 50 })
        expect(isDiscoveryBenchmarkWithinBudget(summary, 60)).toBe(true)
        expect(isDiscoveryBenchmarkWithinBudget(summary, 40)).toBe(false)
    })

    it('rejects an empty or invalid sample set as a release result', () => {
        const summary = summarizeDiscoveryBenchmark([{ durationMs: -1 }, { durationMs: Number.NaN }])

        expect(summary).toEqual({ samples: 0, p50Ms: null, p95Ms: null, maxMs: null })
        expect(isDiscoveryBenchmarkWithinBudget(summary, 250)).toBe(false)
    })
})
