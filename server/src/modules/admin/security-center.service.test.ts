import { describe, expect, it } from 'vitest'

import { SecurityEventActionStatus } from '../../entities/security-event/security-event-action.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    getSecurityCenterEvent,
    getSecurityCenterEvents,
    getSecurityCenterSummary,
    normalizeSecurityCenterOperatorNote,
    revokeSecurityCenterUserSessions,
    toSecurityCenterEventResponse,
    updateSecurityCenterEventStatus,
} from './security-center.service.js'

describe('Security Center service', () => {
    it('requires a super administrator before reading or mutating data', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(getSecurityCenterSummary(admin)).rejects.toMatchObject({ statusCode: 403 })
        await expect(getSecurityCenterEvents(admin)).rejects.toMatchObject({ statusCode: 403 })
        await expect(getSecurityCenterEvent(admin, 'event-1')).rejects.toMatchObject({ statusCode: 403 })
        await expect(updateSecurityCenterEventStatus(admin, 'event-1', SecurityEventActionStatus.Investigating)).rejects.toMatchObject({ statusCode: 403 })
        await expect(revokeSecurityCenterUserSessions(admin, 'user-1')).rejects.toMatchObject({ statusCode: 403 })
    })

    it('sanitizes legacy metadata before returning an investigation event', () => {
        const response = toSecurityCenterEventResponse({
            id: 'event-1',
            userId: null,
            type: 'route_scan',
            severity: 'high',
            failedLoginAttempts: null,
            lockedUntil: null,
            ipAddress: '192.0.2.10',
            userAgent: 'scanner',
            correlationId: 'request-1',
            requestId: 'request-1',
            method: 'GET',
            route: '/admin/security-center',
            statusCode: 404,
            actorRole: null,
            authOutcome: 'anonymous',
            rateLimitResult: 'not_checked',
            requestSizeBytes: null,
            reasonCode: 'route_not_found',
            proxyProvenance: 'direct',
            metadata: {
                password: 'must-not-leak',
                request: { access_token: 'must-not-leak' },
                reason: 'unknown route',
            },
            createdAt: new Date('2026-08-08T00:00:00.000Z'),
        } as never, undefined)

        expect(response.metadata).toEqual({
            password: '[REDACTED]',
            request: { access_token: '[REDACTED]' },
            reason: 'unknown route',
        })
    })

    it('does not allow a super admin to revoke its own active session', async () => {
        await expect(revokeSecurityCenterUserSessions({
            id: 'super-admin-1',
            role: UserRole.SuperAdmin,
        } as never, 'super-admin-1')).rejects.toMatchObject({ statusCode: 409 })
    })

    it('normalizes bounded operator notes before they enter the append-only timeline', () => {
        expect(normalizeSecurityCenterOperatorNote('  Investigate\u0000\nnext step  ')).toBe('Investigate next step')
        expect(normalizeSecurityCenterOperatorNote(' \t ')).toBeNull()
        expect(normalizeSecurityCenterOperatorNote('x'.repeat(1_001))).toHaveLength(1_000)
        expect(normalizeSecurityCenterOperatorNote()).toBeNull()
    })
})
