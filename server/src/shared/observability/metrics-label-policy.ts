import { stripControlCharacters } from '../security/string-normalization.js'

export const MAX_METRIC_LABELS = 8
export const MAX_METRIC_LABEL_LENGTH = 64

export function normalizeMetricLabels(labels: Record<string, string>) {
    const entries = Object.entries(labels)
    if (entries.length > MAX_METRIC_LABELS) {
        throw new Error('Metric label count is outside accepted bounds.')
    }

    return Object.fromEntries(entries.map(([key, value]) => {
        const normalizedKey = stripControlCharacters(key).trim().slice(0, MAX_METRIC_LABEL_LENGTH)
        const normalizedValue = stripControlCharacters(value).trim().slice(0, MAX_METRIC_LABEL_LENGTH)
        if (!normalizedKey || !normalizedValue) throw new Error('Metric label is invalid.')
        return [normalizedKey, normalizedValue]
    }))
}
