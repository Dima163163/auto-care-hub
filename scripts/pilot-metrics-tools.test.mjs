import assert from 'node:assert/strict'
import test from 'node:test'

import { parseAnonymizedPilotMetricsCsv, summarizePilotMetrics, validatePilotEvidenceEnvelope, validatePilotMetricsConsistency } from './pilot-metrics-tools.mjs'

const csv = `participantId,journeyId,responseMinutes,confirmed,cancelled,noShow,duplicateRequests\np-1,j-1,12,1,0,0,0\np-2,j-2,20,0,1,0,0\np-3,j-3,4,1,0,1,0\np-4,j-4,8,1,0,0,0\np-5,j-5,16,1,0,0,0`

test('converts anonymized CSV and computes pilot rates', () => {
    const records = parseAnonymizedPilotMetricsCsv(csv)
    assert.equal(records.length, 5)
    assert.deepEqual(summarizePilotMetrics(records), {
        schemaVersion: 1,
        recordCount: 5,
        responseSamples: 5,
        responseP50Minutes: 12,
        responseP95Minutes: 20,
        confirmationSamples: 5,
        confirmationRatePercent: 80,
        bookingCount: 4,
        cancelCount: 1,
        noShowCount: 1,
        duplicateSubmissionChecks: 5,
        duplicateRequestsCreated: 0,
    })
})

test('rejects PII columns and negative metric values', () => {
    assert.throws(() => parseAnonymizedPilotMetricsCsv(csv.replace('participantId', 'email')))
    assert.throws(() => parseAnonymizedPilotMetricsCsv(csv.replace(',12,', ',-1,')))
})

test('rejects duplicate actor or journey rows and binds aggregate evidence to source rows', () => {
    assert.throws(() => parseAnonymizedPilotMetricsCsv(csv.replace('p-5,j-5', 'p-1,j-5')), /duplicate participant/i)
    const records = parseAnonymizedPilotMetricsCsv(csv)
    const summary = summarizePilotMetrics(records)
    const result = validatePilotMetricsConsistency(records, summary, { maxP95ResponseMinutes: 20, minConfirmationReliabilityPercent: 80 })
    assert.equal(result.pass, true)
    assert.equal(validatePilotMetricsConsistency(records, { ...summary, bookingCount: 99 }, { maxP95ResponseMinutes: 20, minConfirmationReliabilityPercent: 80 }).pass, false)
})

test('rejects synthetic, stale, duplicate and PII-bearing evidence envelopes', () => {
    const now = new Date('2026-09-04T12:00:00Z')
    const base = { schemaVersion: 1, source: 'real', environment: 'staging', collectedAt: '2026-09-04T11:00:00Z', providers: [{ id: 'p-1' }], clients: [{ id: 'c-1' }], journeys: [{ id: 'j-1' }] }
    assert.deepEqual(validatePilotEvidenceEnvelope(base, now), { valid: true, reason: null })
    assert.equal(validatePilotEvidenceEnvelope({ ...base, source: 'synthetic' }, now).valid, false)
    assert.equal(validatePilotEvidenceEnvelope({ ...base, collectedAt: '2026-01-01T00:00:00Z' }, now).reason, 'stale-or-invalid-timestamp')
    assert.equal(validatePilotEvidenceEnvelope({ ...base, clients: [{ id: 'c-1' }, { id: 'c-1' }] }, now).reason, 'duplicate-participant-id')
    assert.equal(validatePilotEvidenceEnvelope({ ...base, journeys: [{ id: 'j-1' }, { id: 'j-1' }] }, now).reason, 'duplicate-journey-id')
    assert.equal(validatePilotEvidenceEnvelope({ ...base, note: 'client@example.com' }, now).reason, 'pii-like-value')
})
