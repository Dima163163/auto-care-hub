import { describe, expect, it } from 'vitest'

import { SecurityEventType } from '../../entities/security-event/security-event.entity.js'
import {
    normalizeSecurityEventUuid,
    normalizeSecurityEventsQuery,
} from './security-events-input-policy.js'

describe('Security events input policy', () => {
    it('normalizes supported event filters and pagination', () => {
        const userId = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeSecurityEventsQuery({
            type: ' LOGIN_FAILED ',
            userId: ` ${userId.toUpperCase()} `,
            cursor: ' eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTAxVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImV2ZW50In0 ',
            limit: 25,
        })).toEqual({
            type: SecurityEventType.LoginFailed,
            userId,
            cursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTAxVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImV2ZW50In0',
            limit: 25,
        })
    })

    it('rejects unknown fields and malformed filters', () => {
        expect(normalizeSecurityEventsQuery(null)).toBeNull()
        expect(normalizeSecurityEventsQuery({ type: SecurityEventType.LoginFailed, extra: true })).toBeNull()
        expect(normalizeSecurityEventsQuery({ type: 'made_up_event' })).toBeNull()
        expect(normalizeSecurityEventsQuery({ userId: 'user-1' })).toBeNull()
        expect(normalizeSecurityEventsQuery({ limit: 101 })).toBeNull()
        expect(normalizeSecurityEventsQuery({ cursor: 'x'.repeat(513) })).toBeNull()
    })

    it('canonicalizes UUIDs and rejects non-UUID identifiers', () => {
        const userId = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeSecurityEventUuid(` ${userId.toUpperCase()} `)).toBe(userId)
        expect(normalizeSecurityEventUuid('user-1')).toBeNull()
        expect(normalizeSecurityEventUuid(null)).toBeNull()
    })
})
