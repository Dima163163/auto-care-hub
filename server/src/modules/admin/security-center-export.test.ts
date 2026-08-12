import { describe, expect, it } from 'vitest'

import {
    securityCenterEventsToCsv,
    getSecurityCenterExportHeaders,
    type SecurityCenterEventResponse,
} from './security-center.service.js'
import { securityCenterExportQuerySchema } from './admin.schemas.js'

describe('Security Center investigation export', () => {
    it('enforces the bounded export query contract', () => {
        expect(securityCenterExportQuerySchema.parse({}).limit).toBe(100)
        expect(securityCenterExportQuerySchema.parse({ limit: 25, requestId: 'request-1' })).toMatchObject({
            limit: 25,
            requestId: 'request-1',
        })
        expect(() => securityCenterExportQuerySchema.parse({ limit: 101 })).toThrow()
    })

    it('exports only redacted bounded fields and neutralizes spreadsheet formulas', () => {
        const csv = securityCenterEventsToCsv([{
            id: 'event-1',
            userId: null,
            type: 'route_scan',
            severity: 'high',
            status: 'open',
            assigneeId: null,
            failedLoginAttempts: null,
            lockedUntil: null,
            ipAddress: '192.0.2.10',
            userAgent: 'AutoCare Hub',
            correlationId: 'request-1',
            requestId: 'request-1',
            method: 'GET',
            route: '=HYPERLINK("https://example.test")',
            statusCode: 404,
            actorRole: null,
            authOutcome: 'anonymous',
            rateLimitResult: 'not_checked',
            requestSizeBytes: null,
            reasonCode: 'route_not_found',
            proxyProvenance: 'direct',
            metadata: { secret: 'must-not-export' },
            createdAt: '2026-08-08T00:00:00.000Z',
            lastAction: null,
            actionTimeline: [],
            relatedAuditLogs: [],
            relatedSystemIncidents: [],
        } as SecurityCenterEventResponse])

        expect(csv).toContain('"metadata"')
        expect(csv).toContain('"[redacted]"')
        expect(csv).not.toContain('must-not-export')
        expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"')
    })

    it('returns private no-store download headers', () => {
        expect(getSecurityCenterExportHeaders('2026-08-08')).toEqual({
            'cache-control': 'no-store',
            pragma: 'no-cache',
            'content-disposition': 'attachment; filename="autocarehub-security-events-2026-08-08.csv"',
        })
    })
})
