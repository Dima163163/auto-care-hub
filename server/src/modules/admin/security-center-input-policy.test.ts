import { describe, expect, it } from 'vitest'

import { SecurityEventActionStatus } from '../../entities/security-event/security-event-action.entity.js'
import {
    normalizeSecurityCenterStatus,
    normalizeSecurityCenterStatusMutation,
    normalizeSecurityCenterUuid,
} from './security-center-input-policy.js'

const eventId = '00000000-0000-4000-8000-000000000001'

describe('security center input policy', () => {
    it('normalizes event status, UUIDs and bounded operator notes', () => {
        expect(normalizeSecurityCenterStatus('  INVESTIGATING ')).toBe(SecurityEventActionStatus.Investigating)
        expect(normalizeSecurityCenterUuid(` ${eventId.toUpperCase()} `)).toBe(eventId)
        expect(normalizeSecurityCenterStatusMutation({ status: 'resolved', operatorNote: '  Investigate next.  ', assigneeId: eventId })).toEqual({
            status: SecurityEventActionStatus.Resolved,
            operatorNote: 'Investigate next.',
            assigneeId: eventId,
        })
    })

    it('preserves omitted and explicit null optional values', () => {
        expect(normalizeSecurityCenterStatusMutation({ status: 'acknowledged' })).toEqual({
            status: SecurityEventActionStatus.Acknowledged,
            operatorNote: null,
            assigneeId: undefined,
        })
        expect(normalizeSecurityCenterStatusMutation({ status: 'acknowledged', operatorNote: null, assigneeId: null })).toEqual({
            status: SecurityEventActionStatus.Acknowledged,
            operatorNote: null,
            assigneeId: null,
        })
    })

    it('rejects malformed status mutations and identifiers', () => {
        expect(normalizeSecurityCenterStatusMutation({ status: 'unknown' })).toBeNull()
        expect(normalizeSecurityCenterStatusMutation({ status: 'resolved', operatorNote: 'x'.repeat(1_001) })).toBeNull()
        expect(normalizeSecurityCenterStatusMutation({ status: 'resolved', assigneeId: 'user-1' })).toBeNull()
        expect(normalizeSecurityCenterUuid(null)).toBeNull()
    })
})
