import { describe, expect, it } from 'vitest'

import {
    normalizeAuditLogPageResponse,
    normalizeAdminPaymentRefundListResponse,
    normalizeAdminPaymentDisputeListResponse,
    normalizeSecurityCenterEventPageResponse,
    normalizeSecurityCenterExportResponse,
    normalizeSecurityCenterSummaryResponse,
    normalizeSecurityMitigationListResponse,
    normalizeSecuritySessionRevocationResponse,
    normalizeSecurityEventPageResponse,
    normalizeOutboxHealthResponse,
    normalizeSystemIncidentResponse,
} from './admin-response-schema'

const auditLog = {
    id: 'audit-1',
    actor: { id: 'admin-1', name: 'Admin' },
    action: 'user_status_updated' as const,
    targetId: 'user-1',
    targetType: 'user',
    metadata: {},
    ipAddress: null,
    createdAt: '2026-08-01T00:00:00.000Z',
}

describe('admin response schemas', () => {
    it('accepts binary Security Center exports and rejects JSON-shaped responses', () => {
        const exportBlob = new Blob(['report'])

        expect(normalizeSecurityCenterExportResponse(exportBlob)).toBe(exportBlob)
        expect(() => normalizeSecurityCenterExportResponse({})).toThrow(/Blob/)
    })

    it('normalizes an array as an empty-cursor page', () => {
        expect(normalizeAuditLogPageResponse([auditLog])).toEqual({ items: [auditLog], nextCursor: null })
    })

    it('parses a system incident', () => {
        expect(normalizeSystemIncidentResponse({
            id: 'incident-1',
            type: 'server_error',
            severity: 'critical',
            status: 'open',
            title: 'Error',
            requestId: null,
            metadata: {},
            occurrenceCount: 1,
            firstOccurredAt: '2026-08-01T00:00:00.000Z',
            lastOccurredAt: '2026-08-01T00:00:00.000Z',
            acknowledgedAt: null,
            resolvedAt: null,
        }).status).toBe('open')
    })

    it('parses bounded outbox health without requiring failed-event details in the UI', () => {
        const result = normalizeOutboxHealthResponse({
            counts: { pending: 2, dead_letter: 1 },
            abandonedCount: 1,
            deadLetterCount: 1,
            failedEvents: [],
        })

        expect(result.deadLetterCount + result.abandonedCount).toBe(2)
    })

    it('parses a redacted security-event page', () => {
        expect(normalizeSecurityEventPageResponse({
            items: [{
                id: 'security-event-1',
                userId: null,
                type: 'login_failed',
                failedLoginAttempts: 2,
                lockedUntil: null,
                ipAddress: '192.0.2.*',
                userAgent: 'test-agent',
                correlationId: 'request-1',
                createdAt: '2026-08-01T00:00:00.000Z',
            }],
            nextCursor: null,
        }).items[0]?.type).toBe('login_failed')
    })

    it('rejects malformed security-event payloads', () => {
        expect(() => normalizeSecurityEventPageResponse({
            items: [{
                id: 'security-event-1',
                userId: null,
                type: 'unknown',
                failedLoginAttempts: 0,
                lockedUntil: null,
                ipAddress: null,
                userAgent: null,
                correlationId: null,
                createdAt: '2026-08-01T00:00:00.000Z',
            }],
            nextCursor: null,
        })).toThrow()
    })

    it('normalizes a session revocation response and rejects incomplete data', () => {
        const response = { userId: 'user-1', revokedAt: '2026-08-08T00:00:00.000Z' }

        expect(normalizeSecuritySessionRevocationResponse(response)).toEqual(response)
        expect(() => normalizeSecuritySessionRevocationResponse({ ...response, userId: '' })).toThrow()
    })

    it('normalizes the super-admin security center contract', () => {
        const event = {
            id: 'security-event-2',
            userId: null,
            type: 'route_scan' as const,
            severity: 'high' as const,
            status: 'open' as const,
            assigneeId: null,
            failedLoginAttempts: null,
            lockedUntil: null,
            ipAddress: '192.0.2.10',
            userAgent: 'scanner',
            correlationId: 'request-2',
            requestId: 'request-2',
            method: 'GET',
            route: '/admin/security-center',
            statusCode: 404,
            actorRole: null,
            authOutcome: 'anonymous' as const,
            rateLimitResult: 'not_checked' as const,
            requestSizeBytes: null,
            reasonCode: 'route_not_found',
            proxyProvenance: 'direct' as const,
            metadata: { reason: 'unknown route' },
            createdAt: '2026-08-01T00:00:00.000Z',
            lastAction: null,
            actionTimeline: [],
            relatedAuditLogs: [],
            relatedSystemIncidents: [],
        }

        expect(normalizeSecurityCenterEventPageResponse({ items: [event], nextCursor: null }).items[0]).toEqual(event)
        expect(normalizeSecurityCenterSummaryResponse({
            windowMinutes: 1_440,
            sampled: false,
            totalEvents: 1,
            openEvents: 1,
            highSeverityEvents: 1,
            criticalSeverityEvents: 0,
            blockedSignals: 0,
            byType: [{ type: 'route_scan', count: 1 }],
            bySeverity: [{ severity: 'high', count: 1 }],
            topIps: [{ ipAddress: '192.0.2.10', count: 1 }],
            topRoutes: [{ route: '/admin/security-center', count: 1 }],
            uniqueIpCount: 1,
            affectedAccountCount: 0,
            repeatedFailedLoginCount: 0,
            requestBursts: [],
            topUserAgents: [{ userAgent: 'AutoCare Hub', count: 1 }],
            rateLimitEffectiveness: { blocked: 0, allowed: 0, notChecked: 1, blockedSharePercent: 0 },
            recentEvents: [event],
        }).recentEvents[0]?.route).toBe('/admin/security-center')
    })

    it('keeps investigation context bounded and typed', () => {
        const event = {
            id: 'security-event-3',
            userId: null,
            type: 'mutation_burst' as const,
            severity: 'critical' as const,
            status: 'investigating' as const,
            assigneeId: 'admin-1',
            failedLoginAttempts: null,
            lockedUntil: null,
            ipAddress: '192.0.2.11',
            userAgent: 'scanner',
            correlationId: 'request-3',
            requestId: 'request-3',
            method: 'POST',
            route: '/api/bookings',
            statusCode: 429,
            actorRole: null,
            authOutcome: 'authenticated' as const,
            rateLimitResult: 'blocked' as const,
            requestSizeBytes: 512,
            reasonCode: 'mutation_burst',
            proxyProvenance: 'trusted_proxy' as const,
            metadata: {},
            createdAt: '2026-08-08T00:00:00.000Z',
            lastAction: {
                status: 'investigating' as const,
                operatorNote: 'Reviewing the request burst.',
                actorId: 'admin-1',
                assigneeId: 'admin-1',
                createdAt: '2026-08-08T00:01:00.000Z',
            },
            actionTimeline: [{
                id: 'action-1',
                status: 'investigating' as const,
                operatorNote: 'Reviewing the request burst.',
                actorId: 'admin-1',
                assigneeId: 'admin-1',
                createdAt: '2026-08-08T00:01:00.000Z',
            }],
            relatedAuditLogs: [{
                id: 'audit-2',
                action: 'security_event_status_updated',
                targetType: 'security_event',
                correlationId: 'request-3',
                createdAt: '2026-08-08T00:01:00.000Z',
            }],
            relatedSystemIncidents: [{
                id: 'incident-2',
                type: 'server_error' as const,
                severity: 'warning' as const,
                status: 'acknowledged' as const,
                title: 'Booking request burst',
                requestId: 'request-3',
                occurrenceCount: 3,
                firstOccurredAt: '2026-08-08T00:00:00.000Z',
                lastOccurredAt: '2026-08-08T00:01:00.000Z',
            }],
        }

        const parsed = normalizeSecurityCenterEventPageResponse({ items: [event], nextCursor: null }).items[0]
        expect(parsed?.actionTimeline[0]?.status).toBe('investigating')
        expect(parsed?.relatedAuditLogs[0]?.correlationId).toBe('request-3')
        expect(parsed?.relatedSystemIncidents[0]?.occurrenceCount).toBe(3)
        expect(() => normalizeSecurityCenterEventPageResponse({
            items: [{ ...event, actionTimeline: new Array(21).fill(event.actionTimeline[0]) }],
            nextCursor: null,
        })).toThrow()
    })

    it('accepts security and future audit actions without dropping the page', () => {
        expect(normalizeAuditLogPageResponse([{
            ...auditLog,
            action: 'refresh_token_reuse',
        }]).items[0]?.action).toBe('refresh_token_reuse')
        expect(normalizeAuditLogPageResponse([{
            ...auditLog,
            action: 'future_platform_action',
        }]).items[0]?.action).toBe('future_platform_action')
    })

    it('normalizes bounded payment refund history', () => {
        expect(normalizeAdminPaymentRefundListResponse([{
            id: 'refund-1',
            paymentId: 'payment-1',
            bookingId: 'booking-1',
            providerRefundId: 're_123',
            providerChargeId: 'ch_123',
            amountMinor: 2500,
            currency: 'rub',
            reason: 'requested_by_customer',
            status: 'succeeded',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
        }])).toHaveLength(1)
        expect(() => normalizeAdminPaymentRefundListResponse(new Array(101).fill({}))).toThrow()
    })

    it('normalizes bounded security mitigation responses', () => {
        const mitigation = {
            id: 'mitigation-1',
            kind: 'ip_block' as const,
            displayValue: '192.0.2.10',
            reason: 'Credential stuffing investigation',
            expiresAt: '2026-08-08T13:00:00.000Z',
            revokedAt: null,
            createdBy: 'admin-1',
            revokedBy: null,
            createdAt: '2026-08-08T12:00:00.000Z',
            status: 'active' as const,
        }

        expect(normalizeSecurityMitigationListResponse([mitigation])).toEqual([mitigation])
        expect(() => normalizeSecurityMitigationListResponse(new Array(101).fill(mitigation))).toThrow()
    })

    it('normalizes bounded payment dispute history', () => {
        expect(normalizeAdminPaymentDisputeListResponse([{
            id: 'dispute-1',
            paymentId: 'payment-1',
            bookingId: 'booking-1',
            providerDisputeId: 'dp_123',
            providerChargeId: 'ch_123',
            amountMinor: 2500,
            currency: 'rub',
            reason: 'fraudulent',
            providerStatus: 'needs_response',
            status: 'open',
            lastEventId: 'evt_123',
            lastEventCreatedAt: '2026-08-01T00:00:00.000Z',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
        }])).toHaveLength(1)
        expect(() => normalizeAdminPaymentDisputeListResponse(new Array(101).fill({}))).toThrow()
    })
})
