import { performance } from 'node:perf_hooks'

import { generateSyntheticDiscoveryDataset, rankSyntheticDiscovery, SYNTHETIC_DISCOVERY_DATASET_SIZES, summarizeDiscoveryBenchmark } from '../modules/autocare/discovery-benchmark.js'

function positiveInteger(name: string, fallback: number) {
    const value = Number(process.env[name] ?? fallback)
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`)
    return value
}

function runDataset(size: number, iterations: number) {
    const records = generateSyntheticDiscoveryDataset(size)
    const samples = Array.from({ length: iterations }, () => {
        const startedAt = performance.now()
        const result = rankSyntheticDiscovery({ records, latitude: 55.7558, longitude: 37.6173, radiusKm: 25, limit: 20 })
        if (result.length > 20) throw new Error('Synthetic discovery returned more than the requested page size.')
        return { durationMs: performance.now() - startedAt }
    })
    return { size, ...summarizeDiscoveryBenchmark(samples) }
}

const iterations = positiveInteger('BENCHMARK_DISCOVERY_SYNTHETIC_ITERATIONS', 3)
const results = SYNTHETIC_DISCOVERY_DATASET_SIZES.map((size) => runDataset(size, iterations))
console.info(JSON.stringify({
    strategy: 'portable-sql-like-in-memory-baseline',
    postgis: 'not-run: requires a PostGIS-enabled staging database',
    iterations,
    results,
}))
