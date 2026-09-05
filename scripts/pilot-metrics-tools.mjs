const PII_COLUMN_PATTERN = /(?:email|phone|mobile|vin|plate|license|address|street|name|message|chat|photo|token|secret|password)/i
const PII_VALUE_KEY_PATTERN = /(?:email|phone|mobile|vin|plate|license|address|street|name|message|chat|photo|token|secret|password|note|body|text|content|comment|description|review)/i
const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const VIN_VALUE_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/i
const PHONE_VALUE_PATTERN = /(?:^|\D)\+?\d[\d\s().-]{7,}\d(?:$|\D)/
const REQUIRED_COLUMNS = ['participantId', 'journeyId', 'responseMinutes', 'confirmed', 'cancelled', 'noShow', 'duplicateRequests']

function parseCsvLine(line) {
    const cells = []
    let cell = ''
    let quoted = false
    for (let index = 0; index < line.length; index += 1) {
        const character = line[index]
        if (character === '"' && line[index + 1] === '"' && quoted) {
            cell += '"'
            index += 1
        } else if (character === '"') quoted = !quoted
        else if (character === ',' && !quoted) {
            cells.push(cell.trim())
            cell = ''
        } else cell += character
    }
    if (quoted) throw new Error('CSV contains an unterminated quoted field.')
    cells.push(cell.trim())
    return cells
}

function parseNonNegative(value, field, rowNumber) {
    const number = Number(value)
    if (!Number.isFinite(number) || number < 0) throw new Error(`CSV row ${rowNumber} has an invalid non-negative ${field}.`)
    return number
}

export function parseAnonymizedPilotMetricsCsv(source) {
    const lines = String(source ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (lines.length < 2) throw new Error('Pilot metrics CSV must contain a header and at least one row.')
    const headers = parseCsvLine(lines[0])
    if (headers.some((header) => PII_COLUMN_PATTERN.test(header))) throw new Error('Pilot metrics CSV contains a PII-like column.')
    const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))
    if (missing.length > 0) throw new Error(`Pilot metrics CSV is missing columns: ${missing.join(', ')}`)
    const records = lines.slice(1).map((line, index) => {
        const values = parseCsvLine(line)
        if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${values.length} cells; expected ${headers.length}.`)
        const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]]))
        if (!record.participantId || !record.journeyId) throw new Error(`CSV row ${index + 2} is missing an anonymized participant or journey id.`)
        return {
            participantId: record.participantId,
            journeyId: record.journeyId,
            responseMinutes: parseNonNegative(record.responseMinutes, 'responseMinutes', index + 2),
            confirmed: parseNonNegative(record.confirmed, 'confirmed', index + 2),
            cancelled: parseNonNegative(record.cancelled, 'cancelled', index + 2),
            noShow: parseNonNegative(record.noShow, 'noShow', index + 2),
            duplicateRequests: parseNonNegative(record.duplicateRequests, 'duplicateRequests', index + 2),
        }
    })
    if (new Set(records.map((record) => record.participantId)).size !== records.length) throw new Error('Pilot metrics CSV contains duplicate participant IDs.')
    if (new Set(records.map((record) => record.journeyId)).size !== records.length) throw new Error('Pilot metrics CSV contains duplicate journey IDs.')
    return records
}

export function summarizePilotMetrics(records) {
    if (!Array.isArray(records) || records.length === 0) throw new Error('At least one anonymized pilot metric record is required.')
    const durations = records.map((record) => record.responseMinutes).sort((left, right) => left - right)
    const total = (field) => records.reduce((sum, record) => sum + record[field], 0)
    const percentile = (value) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)] ?? null
    const bookingCount = total('confirmed')
    return {
        schemaVersion: 1,
        recordCount: records.length,
        responseSamples: records.length,
        responseP50Minutes: percentile(0.5),
        responseP95Minutes: percentile(0.95),
        confirmationSamples: records.length,
        confirmationRatePercent: Number(((bookingCount / records.length) * 100).toFixed(2)),
        bookingCount,
        cancelCount: total('cancelled'),
        noShowCount: total('noShow'),
        duplicateSubmissionChecks: records.length,
        duplicateRequestsCreated: total('duplicateRequests'),
    }
}

function containsPiiLikeValue(value, key = '') {
    if (typeof value === 'string') {
        const normalized = value.trim()
        if (!normalized) return false
        if (PII_VALUE_KEY_PATTERN.test(key)) return true
        if (EMAIL_VALUE_PATTERN.test(normalized) || VIN_VALUE_PATTERN.test(normalized)) return true
        if (!/(?:at|date|time|id|version|count|minutes|percent|rate|mode|status|path|source|environment|market)/i.test(key)
            && PHONE_VALUE_PATTERN.test(normalized)) return true
        return false
    }
    if (Array.isArray(value)) return value.some((item) => containsPiiLikeValue(item, key))
    if (!value || typeof value !== 'object') return false
    return Object.entries(value).some(([entryKey, entryValue]) => containsPiiLikeValue(entryValue, entryKey))
}

export function validatePilotMetricsConsistency(records, evidenceMetrics, {
    maxP95ResponseMinutes = 30,
    minConfirmationReliabilityPercent = 95,
} = {}) {
    const expected = summarizePilotMetrics(records)
    const actual = evidenceMetrics && typeof evidenceMetrics === 'object' ? evidenceMetrics : {}
    const comparedFields = [
        'recordCount',
        'responseSamples',
        'responseP50Minutes',
        'responseP95Minutes',
        'confirmationSamples',
        'confirmationRatePercent',
        'bookingCount',
        'cancelCount',
        'noShowCount',
        'duplicateSubmissionChecks',
        'duplicateRequestsCreated',
    ]
    const mismatches = comparedFields
        .filter((field) => Number(actual[field]) !== Number(expected[field])
            && !(actual[field] === null && expected[field] === null))
        .map((field) => ({ field, expected: expected[field], actual: actual[field] }))
    const thresholds = {
        responseP95: expected.responseP95Minutes !== null && expected.responseP95Minutes <= maxP95ResponseMinutes,
        confirmationReliability: expected.confirmationRatePercent >= minConfirmationReliabilityPercent,
    }
    return {
        pass: mismatches.length === 0 && thresholds.responseP95 && thresholds.confirmationReliability,
        expected,
        mismatches,
        thresholds,
    }
}

export function validatePilotEvidenceEnvelope(input, now = new Date(), maxAgeDays = 90) {
    const evidence = input && typeof input === 'object' ? input : {}
    if (evidence.schemaVersion !== 1 || evidence.source !== 'real' || !['staging', 'production'].includes(evidence.environment)) return { valid: false, reason: 'synthetic-or-unsupported-provenance' }
    const collectedAt = Date.parse(String(evidence.collectedAt ?? ''))
    const ageMs = now.getTime() - collectedAt
    if (!Number.isFinite(collectedAt) || ageMs < 0 || ageMs > maxAgeDays * 24 * 60 * 60 * 1_000) return { valid: false, reason: 'stale-or-invalid-timestamp' }
    const providers = Array.isArray(evidence.providers) ? evidence.providers : []
    const clients = Array.isArray(evidence.clients) ? evidence.clients : []
    const journeys = Array.isArray(evidence.journeys) ? evidence.journeys : []
    if (new Set(providers.map((provider) => provider?.id)).size !== providers.length) return { valid: false, reason: 'duplicate-provider-id' }
    if (new Set(clients.map((client) => client?.id)).size !== clients.length) return { valid: false, reason: 'duplicate-participant-id' }
    if (new Set(journeys.map((journey) => journey?.id)).size !== journeys.length) return { valid: false, reason: 'duplicate-journey-id' }
    if (containsPiiLikeValue(input)) return { valid: false, reason: 'pii-like-value' }
    return { valid: true, reason: null }
}
