export type DiscoveryBenchmarkSample = {
    durationMs: number
}

export type DiscoveryBenchmarkSummary = {
    samples: number
    p50Ms: number | null
    p95Ms: number | null
    maxMs: number | null
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
        p50Ms: percentile(durations, 50),
        p95Ms: percentile(durations, 95),
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
