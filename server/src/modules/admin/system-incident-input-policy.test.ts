import { describe, expect, it } from 'vitest'

import {
    normalizeSystemIncidentRecordInput,
    normalizeSystemIncidentStatus,
    normalizeSystemIncidentUuid,
} from './system-incident-input-policy.js'

const incidentId = '00000000-0000-4000-8000-000000000001'

describe('system incident input policy', () => {
    it('normalizes record fields and enum values', () => {
        expect(normalizeSystemIncidentRecordInput({
            type: ' SERVER_ERROR ',
            severity: ' CRITICAL ',
            title: '  Database unavailable  ',
            requestId: ' request-1 ',
            metadata: { route: '/health' },
        })).toEqual({
            type: 'server_error',
            severity: 'critical',
            title: 'Database unavailable',
            requestId: 'request-1',
            metadata: { route: '/health' },
        })
    })

    it('rejects unsupported fields, enums and metadata shapes', () => {
        expect(normalizeSystemIncidentRecordInput({ type: 'server_error', severity: 'critical', title: 'Failure', unsafe: true })).toBeNull()
        expect(normalizeSystemIncidentRecordInput({ type: 'unknown', severity: 'critical', title: 'Failure' })).toBeNull()
        expect(normalizeSystemIncidentRecordInput({ type: 'server_error', severity: 'critical', title: 'Failure', metadata: [] })).toBeNull()
    })

    it('bounds titles and request ids', () => {
        expect(normalizeSystemIncidentRecordInput({ type: 'server_error', severity: 'critical', title: 'Failure', requestId: 'x'.repeat(200) })?.requestId).toHaveLength(128)
        expect(normalizeSystemIncidentRecordInput({ type: 'server_error', severity: 'critical', title: 'x'.repeat(241) })).toBeNull()
        expect(normalizeSystemIncidentStatus(' RESOLVED ')).toBe('resolved')
    })

    it('normalizes UUIDs and rejects malformed values', () => {
        expect(normalizeSystemIncidentUuid(` ${incidentId.toUpperCase()} `)).toBe(incidentId)
        expect(normalizeSystemIncidentUuid('incident-1')).toBeNull()
    })
})
