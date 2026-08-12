export const MAX_METRIC_NAME_LENGTH = 100

export function normalizeMetricName(name: string) {
    const normalized = name.trim()
    if (!/^[a-z][a-z0-9_]*$/.test(normalized) || normalized.length > MAX_METRIC_NAME_LENGTH) {
        throw new Error('Metric name is invalid.')
    }

    return normalized
}
