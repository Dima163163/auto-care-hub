import { describe, expect, it } from 'vitest'

import { evaluatePilotEvidence } from './pilot-evidence-policy.js'

const baseEvidence = {
    schemaVersion: 1,
    source: 'real',
    environment: 'staging',
    marketId: 'samara',
    collectedAt: '2026-08-27T10:00:00.000Z',
    providers: [
        { id: 'provider-a', verified: true, consentRecorded: true, bookingMode: 'online' },
        { id: 'provider-b', verified: true, consentRecorded: true, bookingMode: 'request_call' },
    ],
    clients: Array.from({ length: 5 }, (_, index) => ({ id: `client-${index + 1}`, consentRecorded: true, vehicleRefs: [`vehicle-${index + 1}`] })),
    vehicles: Array.from({ length: 5 }, (_, index) => ({ id: `vehicle-${index + 1}`, clientId: `client-${index + 1}`, make: 'BMW', model: 'X5', year: 2021, plateCaptured: true, vinCaptured: false })),
    journeys: [
        {
            id: 'journey-fixed', providerId: 'provider-a', clientId: 'client-1', path: 'fixed', reviewPhotoCount: 0,
            events: ['request_created', 'quote_declined', 'cancelled', 'support_contacted', 'support_resolved'],
        },
        {
            id: 'journey-quote', providerId: 'provider-b', clientId: 'client-2', path: 'quote', reviewPhotoCount: 2,
            events: ['request_created', 'quote_sent', 'quote_accepted', 'rescheduled', 'completed', 'review_submitted', 'review_photo_submitted', 'bonus_granted', 'bonus_redeemed', 'complaint_submitted'],
        },
        { id: 'journey-3', providerId: 'provider-a', clientId: 'client-3', path: 'fixed', reviewPhotoCount: 0, events: ['request_created', 'completed'] },
        { id: 'journey-4', providerId: 'provider-b', clientId: 'client-4', path: 'quote', reviewPhotoCount: 0, events: ['request_created', 'completed'] },
        { id: 'journey-5', providerId: 'provider-a', clientId: 'client-5', path: 'fixed', reviewPhotoCount: 0, events: ['request_created', 'completed'] },
    ],
    metrics: {
        responseSamples: 5, responseP50Minutes: 12, responseP95Minutes: 40, confirmationSamples: 5,
        confirmationRatePercent: 100, bookingCount: 5, cancelCount: 1, noShowCount: 1,
        duplicateSubmissionChecks: 1, duplicateRequestsCreated: 0,
    },
    privacy: { piiRedacted: true, evidenceRetentionDays: 90 },
}

describe('real pilot evidence policy', () => {
    it('accepts a complete anonymized real-pilot document', () => {
        expect(evaluatePilotEvidence(baseEvidence).filter((check) => check.status === 'blocked')).toEqual([])
    })

    it('rejects mock provenance and under-sized participant samples', () => {
        const input = {
            ...baseEvidence,
            source: 'mock',
            clients: baseEvidence.clients.slice(0, 2),
        }
        const checks = evaluatePilotEvidence(input)
        expect(checks.some((check) => check.name === 'Evidence provenance' && check.status === 'blocked')).toBe(true)
        expect(checks.some((check) => check.name === 'Real clients and consent' && check.status === 'blocked')).toBe(true)
    })

    it('requires the duplicate request check to prove zero duplicates', () => {
        const checks = evaluatePilotEvidence({
            ...baseEvidence,
            metrics: { ...baseEvidence.metrics, duplicateRequestsCreated: 1 },
        })
        expect(checks.some((check) => check.name === 'Idempotency evidence' && check.status === 'blocked')).toBe(true)
    })
})
