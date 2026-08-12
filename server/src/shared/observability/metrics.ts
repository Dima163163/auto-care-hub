import { normalizeMetricLabels } from './metrics-label-policy.js'
import { normalizeMetricName } from './metrics-name-policy.js'

export type MetricLabels = Record<string, string>

export type MetricsRegistryOptions = {
    maxSeriesPerMetric?: number
}

export type MetricsSnapshot = {
    gauges: Array<{
        name: string
        labels: MetricLabels
        value: number
    }>
    counters: Array<{
        name: string
        labels: MetricLabels
        value: number
    }>
    histograms: Array<{
        name: string
        labels: MetricLabels
        count: number
        sum: number
        max: number
    }>
}

export const MAX_METRICS_SNAPSHOT_SERIES = 1_500

export function getBoundedMetricsSnapshot(
    snapshot: MetricsSnapshot,
    maxSeries = MAX_METRICS_SNAPSHOT_SERIES,
): MetricsSnapshot {
    if (!Number.isInteger(maxSeries) || maxSeries < 1) {
        throw new Error('Metrics snapshot bound is invalid.')
    }

    let remaining = maxSeries
    const take = <T>(items: T[]) => {
        const selected = items.slice(0, remaining)
        remaining -= selected.length
        return selected
    }

    return {
        gauges: take(snapshot.gauges),
        counters: take(snapshot.counters),
        histograms: take(snapshot.histograms),
    }
}

type CounterValue = {
    name: string
    labels: MetricLabels
    value: number
}

type HistogramValue = {
    name: string
    labels: MetricLabels
    count: number
    sum: number
    max: number
}

function getMetricKey(name: string, labels: MetricLabels) {
    return `${name}:${Object.entries(labels)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join(',')}`
}

export class MetricsRegistry {
    private readonly maxSeriesPerMetric: number
    private readonly gauges = new Map<string, CounterValue>()
    private readonly counters = new Map<string, CounterValue>()
    private readonly histograms = new Map<string, HistogramValue>()
    private readonly seriesCounts = new Map<string, number>()

    constructor(options: MetricsRegistryOptions = {}) {
        this.maxSeriesPerMetric = options.maxSeriesPerMetric ?? 100
    }

    private canRegisterSeries(name: string, key: string, metrics: Map<string, unknown>) {
        if (metrics.has(key)) return true

        const currentCount = this.seriesCounts.get(name) ?? 0
        if (currentCount >= this.maxSeriesPerMetric) return false

        this.seriesCounts.set(name, currentCount + 1)
        return true
    }

    increment(name: string, value = 1, labels: MetricLabels = {}) {
        if (!Number.isFinite(value) || value <= 0) return

        const normalizedName = normalizeMetricName(name)
        const normalizedLabels = normalizeMetricLabels(labels)
        const key = getMetricKey(normalizedName, normalizedLabels)
        if (!this.canRegisterSeries(normalizedName, key, this.counters)) return
        const metric = this.counters.get(key) ?? { name: normalizedName, labels: normalizedLabels, value: 0 }
        metric.value += value
        this.counters.set(key, metric)
    }

    setGauge(name: string, value: number, labels: MetricLabels = {}) {
        if (!Number.isFinite(value)) return

        const normalizedName = normalizeMetricName(name)
        const normalizedLabels = normalizeMetricLabels(labels)
        const key = getMetricKey(normalizedName, normalizedLabels)
        if (!this.canRegisterSeries(normalizedName, key, this.gauges)) return
        this.gauges.set(key, { name: normalizedName, labels: normalizedLabels, value })
    }

    observe(name: string, value: number, labels: MetricLabels = {}) {
        if (!Number.isFinite(value) || value < 0) return

        const normalizedName = normalizeMetricName(name)
        const normalizedLabels = normalizeMetricLabels(labels)
        const key = getMetricKey(normalizedName, normalizedLabels)
        if (!this.canRegisterSeries(normalizedName, key, this.histograms)) return
        const metric = this.histograms.get(key) ?? {
            name: normalizedName,
            labels: normalizedLabels,
            count: 0,
            sum: 0,
            max: 0,
        }
        metric.count += 1
        metric.sum += value
        metric.max = Math.max(metric.max, value)
        this.histograms.set(key, metric)
    }

    snapshot(): MetricsSnapshot {
        return getBoundedMetricsSnapshot({
            gauges: [...this.gauges.values()].map((metric) => ({
                ...metric,
                labels: { ...metric.labels },
            })),
            counters: [...this.counters.values()].map((metric) => ({
                ...metric,
                labels: { ...metric.labels },
            })),
            histograms: [...this.histograms.values()].map((metric) => ({
                ...metric,
                labels: { ...metric.labels },
            })),
        })
    }

    reset() {
        this.gauges.clear()
        this.counters.clear()
        this.histograms.clear()
        this.seriesCounts.clear()
    }
}

export const metrics = new MetricsRegistry()
