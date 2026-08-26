import { performance } from 'node:perf_hooks'

export type DiscoveryBenchmarkSample = {
    durationMs: number
    ok?: boolean
}

export type DiscoveryBenchmarkSummary = {
    samples: number
    failedSamples: number
    p50Ms: number | null
    p95Ms: number | null
    p99Ms: number | null
    maxMs: number | null
}

export type SyntheticDiscoveryRecord = {
    id: string
    latitude: number
    longitude: number
    priceMinor: number
    rating: number
}

export const SYNTHETIC_DISCOVERY_DATASET_SIZES = [10_000, 100_000] as const

/** Deterministic data for repeatable local benchmark runs (not production data). */
export function generateSyntheticDiscoveryDataset(size: number, seed = 42): SyntheticDiscoveryRecord[] {
    if (!Number.isInteger(size) || size < 1) throw new Error('Synthetic discovery size must be a positive integer.')
    let state = seed >>> 0
    const random = () => {
        state = (1664525 * state + 1013904223) >>> 0
        return state / 4_294_967_296
    }
    return Array.from({ length: size }, (_, index) => ({
        id: `synthetic-provider-${index.toString().padStart(6, '0')}`,
        latitude: 55.7558 + (random() - 0.5) * 1.6,
        longitude: 37.6173 + (random() - 0.5) * 2.4,
        priceMinor: 1_000 + Math.floor(random() * 800_000),
        rating: Math.round((3.2 + random() * 1.8) * 10) / 10,
    }))
}

function approximateDistanceKm(left: SyntheticDiscoveryRecord, latitude: number, longitude: number) {
    const latDistance = (left.latitude - latitude) * 111
    const lngDistance = (left.longitude - longitude) * 111 * Math.cos((latitude * Math.PI) / 180)
    return Math.sqrt((latDistance ** 2) + (lngDistance ** 2))
}

/** Portable-SQL-like filter/rank baseline used when PostGIS is unavailable. */
export function rankSyntheticDiscovery(input: {
    records: readonly SyntheticDiscoveryRecord[]
    latitude: number
    longitude: number
    radiusKm: number
    limit: number
}) {
    return input.records
        .map((record) => ({ record, distanceKm: approximateDistanceKm(record, input.latitude, input.longitude) }))
        .filter((item) => item.distanceKm <= input.radiusKm)
        .sort((left, right) => left.distanceKm - right.distanceKm || right.record.rating - left.record.rating || left.record.id.localeCompare(right.record.id))
        .slice(0, input.limit)
}

function percentile(values: readonly number[], percentileValue: number) {
    if (values.length === 0) return null
    const sorted = [...values].sort((left, right) => left - right)
    const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)
    const value = sorted[Math.max(0, index)]
    return value === undefined ? null : Math.round(value * 10) / 10
}

/** A tiny, deterministic summary used by the Docker-backed discovery release gate. */
export function summarizeDiscoveryBenchmark(samples: readonly DiscoveryBenchmarkSample[]): DiscoveryBenchmarkSummary {
    const durations = samples
        .map((sample) => sample.durationMs)
        .filter((duration): duration is number => Number.isFinite(duration) && duration >= 0)

    return {
        samples: durations.length,
        failedSamples: samples.filter((sample) => sample.ok === false).length,
        p50Ms: percentile(durations, 50),
        p95Ms: percentile(durations, 95),
        p99Ms: percentile(durations, 99),
        maxMs: durations.length === 0 ? null : Math.round(Math.max(...durations) * 10) / 10,
    }
}

export function isDiscoveryBenchmarkWithinBudget(summary: DiscoveryBenchmarkSummary, p95BudgetMs: number) {
    return summary.samples > 0
        && Number.isFinite(p95BudgetMs)
        && p95BudgetMs > 0
        && summary.p95Ms !== null
        && summary.p95Ms <= p95BudgetMs
}

export type ConcurrentDiscoveryBenchmarkOptions = {
    iterations: number
    concurrency: number
    task: (iteration: number) => Promise<unknown>
}

/**
 * Runs the same discovery operation through a bounded worker pool. Keeping
 * this in a shared module makes the local Docker benchmark and CI tests use
 * the same p50/p95/p99 accounting without introducing a load-test dependency.
 */
export async function runConcurrentDiscoveryBenchmark(options: ConcurrentDiscoveryBenchmarkOptions): Promise<DiscoveryBenchmarkSummary> {
    if (!Number.isSafeInteger(options.iterations) || options.iterations < 1) throw new Error('Benchmark iterations must be a positive integer.')
    if (!Number.isSafeInteger(options.concurrency) || options.concurrency < 1) throw new Error('Benchmark concurrency must be a positive integer.')

    const samples: DiscoveryBenchmarkSample[] = []
    let nextIteration = 0
    const workerCount = Math.min(options.concurrency, options.iterations)

    async function worker() {
        while (nextIteration < options.iterations) {
            const iteration = nextIteration
            nextIteration += 1
            const startedAt = performance.now()
            try {
                await options.task(iteration)
                samples.push({ durationMs: performance.now() - startedAt, ok: true })
            } catch {
                samples.push({ durationMs: performance.now() - startedAt, ok: false })
            }
        }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()))
    return summarizeDiscoveryBenchmark(samples)
}

export function isDiscoveryBenchmarkWithinBudgets(
    summary: DiscoveryBenchmarkSummary,
    budgets: { p95Ms: number; p99Ms: number; maxFailureRatePercent?: number },
) {
    const failureRate = summary.samples === 0 ? 100 : (summary.failedSamples / summary.samples) * 100
    return summary.samples > 0
        && summary.p95Ms !== null
        && summary.p99Ms !== null
        && Number.isFinite(budgets.p95Ms)
        && Number.isFinite(budgets.p99Ms)
        && budgets.p95Ms > 0
        && budgets.p99Ms > 0
        && summary.p95Ms <= budgets.p95Ms
        && summary.p99Ms <= budgets.p99Ms
        && failureRate <= (budgets.maxFailureRatePercent ?? 0)
}
