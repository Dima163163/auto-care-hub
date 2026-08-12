import { describe, expect, it } from 'vitest'

import {
    SecurityEventAuthOutcome,
    SecurityEventSeverity,
    SecurityEventProxyProvenance,
    SecurityEventRateLimitResult,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    normalizeSecurityEventStreamInput,
} from './security-event-stream.js'

describe('security event stream policy', () => {
    it('normalizes request metadata and keeps the event type', () => {
        const result = normalizeSecurityEventStreamInput({
            userId: 'user-1',
            type: SecurityEventType.AccountLocked,
            failedLoginAttempts: 5,
            lockedUntil: new Date('2026-07-30T12:00:00.000Z'),
            ipAddress: '  127.0.0.1  ',
            userAgent: ' browser ',
            correlationId: 'request-1',
        })

        expect(result).toMatchObject({
            userId: 'user-1',
            type: SecurityEventType.AccountLocked,
            failedLoginAttempts: 5,
            ipAddress: '127.0.0.1',
            userAgent: 'browser',
            correlationId: 'request-1',
        })
    })

    it('rejects invalid attempt counters before persistence', () => {
        expect(() => normalizeSecurityEventStreamInput({
            type: SecurityEventType.LoginFailed,
            failedLoginAttempts: 0,
        })).toThrow('Security event login attempts are invalid.')
    })

    it('preserves refresh-token reuse as its own event type', () => {
        expect(normalizeSecurityEventStreamInput({
            userId: 'user-1',
            type: SecurityEventType.RefreshTokenReuse,
        })).toMatchObject({
            type: SecurityEventType.RefreshTokenReuse,
            failedLoginAttempts: null,
        })
    })

    it('propagates bounded request metadata when explicit values are absent', () => {
        const result = normalizeSecurityEventStreamInput({
            type: SecurityEventType.RefreshTokenReuse,
            request: {
                id: 'request-42',
                ip: ' 127.0.0.1 ',
                headers: { 'user-agent': ' Browser 1 ' },
            } as never,
        })

        expect(result).toMatchObject({
            correlationId: 'request-42',
            ipAddress: '127.0.0.1',
            userAgent: 'Browser 1',
        })
    })

    it('keeps attack visibility fields bounded and typed', () => {
        const result = normalizeSecurityEventStreamInput({
            type: SecurityEventType.RouteScan,
            severity: SecurityEventSeverity.High,
            method: ' GET ',
            route: ' /admin/security-center ',
            statusCode: 404,
            requestId: 'request-99',
            actorRole: UserRole.SuperAdmin,
            authOutcome: SecurityEventAuthOutcome.Authenticated,
            rateLimitResult: SecurityEventRateLimitResult.Blocked,
            requestSizeBytes: 128,
            reasonCode: 'PAYLOAD_TOO_LARGE',
            proxyProvenance: SecurityEventProxyProvenance.TrustedProxy,
            metadata: { reason: 'unknown route' },
        })

        expect(result).toMatchObject({
            type: SecurityEventType.RouteScan,
            severity: SecurityEventSeverity.High,
            method: 'GET',
            route: '/admin/security-center',
            statusCode: 404,
            requestId: 'request-99',
            actorRole: UserRole.SuperAdmin,
            authOutcome: SecurityEventAuthOutcome.Authenticated,
            rateLimitResult: SecurityEventRateLimitResult.Blocked,
            requestSizeBytes: 128,
            reasonCode: 'payload_too_large',
            proxyProvenance: SecurityEventProxyProvenance.TrustedProxy,
            metadata: { reason: 'unknown route' },
        })
    })

    it('derives request size and rejects untrusted forwarded provenance', () => {
        const result = normalizeSecurityEventStreamInput({
            type: SecurityEventType.OversizedRequest,
            request: {
                id: 'request-size-1',
                ip: '198.51.100.10',
                headers: {
                    'content-length': '2048',
                    'x-forwarded-for': '203.0.113.10',
                },
            } as never,
        })

        expect(result.requestSizeBytes).toBe(2048)
        expect(result.proxyProvenance).toBe(SecurityEventProxyProvenance.ForwardedHeaderUntrusted)
        expect(() => normalizeSecurityEventStreamInput({
            type: SecurityEventType.OversizedRequest,
            requestSizeBytes: 50_000_001,
        })).toThrow('Security event request size is invalid.')
    })
})
