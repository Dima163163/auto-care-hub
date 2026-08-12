import { describe, expect, it } from 'vitest'

import {
    getFailedSecurityEventSinks,
    getSecurityEventSinkFailureMetadata,
    SECURITY_EVENT_SINK_FAILURE_INCIDENT_TITLE,
} from './security-event-sink.js'

describe('security event sink outcomes', () => {
    it('identifies failed sinks without exposing rejection details', () => {
        expect(getFailedSecurityEventSinks([
            { status: 'fulfilled', value: undefined },
            { status: 'rejected', reason: new Error('database unavailable') },
        ])).toEqual(['security_event'])
    })

    it('handles a missing result as a failed sink', () => {
        expect(getFailedSecurityEventSinks([
            { status: 'fulfilled', value: undefined },
        ])).toEqual(['security_event'])
    })

    it('builds a bounded incident payload without rejection details', () => {
        const failedSinks = getFailedSecurityEventSinks([
            { status: 'rejected', reason: new Error('private database detail') },
            { status: 'fulfilled', value: undefined },
        ])

        expect(SECURITY_EVENT_SINK_FAILURE_INCIDENT_TITLE).toBe('Security event sink write failed')
        expect(getSecurityEventSinkFailureMetadata(failedSinks)).toEqual({
            failedSinks: ['audit_log'],
            sinkCount: 1,
        })
    })
})
