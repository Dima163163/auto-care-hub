import { describe, expect, it } from 'vitest'

import { generateSyntheticDiscoveryDataset, isDiscoveryBenchmarkWithinBudget, rankSyntheticDiscovery, summarizeDiscoveryBenchmark, SYNTHETIC_DISCOVERY_DATASET_SIZES } from './discovery-benchmark.js'

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

describe('synthetic discovery benchmark', () => {
    it('generates deterministic datasets at the two release-check sizes', () => {
        for (const size of SYNTHETIC_DISCOVERY_DATASET_SIZES) {
            const first = generateSyntheticDiscoveryDataset(size)
            const second = generateSyntheticDiscoveryDataset(size)
            expect(first).toHaveLength(size)
            expect(first[0]).toEqual(second[0])
            expect(first.at(-1)).toEqual(second.at(-1))
        }
    }, 20_000)

    it('keeps the portable baseline bounded and ordered by distance', () => {
        const records = generateSyntheticDiscoveryDataset(10_000)
        const result = rankSyntheticDiscovery({ records, latitude: 55.7558, longitude: 37.6173, radiusKm: 25, limit: 20 })
        expect(result.length).toBeLessThanOrEqual(20)
        expect(result.every((item) => item.distanceKm <= 25)).toBe(true)
        expect(result.map((item) => item.distanceKm)).toEqual([...result.map((item) => item.distanceKm)].sort((a, b) => a - b))
    })
})
