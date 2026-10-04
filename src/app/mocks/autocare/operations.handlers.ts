import { http, HttpResponse } from "msw"
import { currentMockUser } from './mock-access'
import { mockSecurityEvents, mockSecurityMitigations, mockSystemIncidents } from './mock-fixtures'
import type { MockSecurityEvent, MockSecurityMitigation } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const operationsHandlers = [
{ order: 37, handler: http.get('/api/admin/audit-logs', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.trim().toLowerCase()
        const action = url.searchParams.get('action')?.trim().toLowerCase()
        const targetType = url.searchParams.get('targetType')?.trim().toLowerCase()
        const actorId = url.searchParams.get('actorId')?.trim().toLowerCase()
        const auditLogs = [
            {
                id: 'log-1',
                actor: { id: 'admin-1', name: 'Super Admin' },
                action: 'admin_created',
                targetId: 'admin-2',
                targetType: 'user',
                metadata: { email: 'new.admin@example.com' },
                ipAddress: '127.0.0.1',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'log-2',
                actor: { id: 'admin-1', name: 'Super Admin' },
                action: 'user_status_updated',
                targetId: 'user-123',
                targetType: 'user',
                metadata: { oldStatus: 'active', newStatus: 'blocked' },
                ipAddress: '127.0.0.1',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
        ]
        const filteredLogs = auditLogs.filter((log) => {
            if (search && !JSON.stringify(log).toLowerCase().includes(search)) return false
            if (action && log.action.toLowerCase() !== action) return false
            if (targetType && log.targetType.toLowerCase() !== targetType) return false
            if (actorId && log.actor.id.toLowerCase() !== actorId) return false
            return true
        })

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredLogs, nextCursor: null })
        }

        return HttpResponse.json(filteredLogs)
    }) },
{ order: 38, handler: http.get('/api/admin/security-events', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        const userId = url.searchParams.get('userId')
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!type || event.type === type) &&
            (!userId || event.userId === userId)
        ))

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredEvents, nextCursor: null })
        }

        return HttpResponse.json(filteredEvents)
    }) },
{ order: 39, handler: http.get('/api/admin/security-center/summary', () => {
        const byType = new Map<string, number>()
        const bySeverity = new Map<string, number>()
        const ips = new Map<string, number>()
        const routes = new Map<string, number>()
        for (const event of mockSecurityEvents) {
            byType.set(event.type, (byType.get(event.type) ?? 0) + 1)
            bySeverity.set(event.severity, (bySeverity.get(event.severity) ?? 0) + 1)
            if (event.ipAddress) ips.set(event.ipAddress, (ips.get(event.ipAddress) ?? 0) + 1)
            if (event.route) routes.set(event.route, (routes.get(event.route) ?? 0) + 1)
        }
        return HttpResponse.json({
            windowMinutes: 1440,
            sampled: false,
            totalEvents: mockSecurityEvents.length,
            openEvents: mockSecurityEvents.filter((event) => event.status === 'open').length,
            highSeverityEvents: mockSecurityEvents.filter((event) => event.severity === 'high').length,
            criticalSeverityEvents: mockSecurityEvents.filter((event) => event.severity === 'critical').length,
            blockedSignals: mockSecurityEvents.filter((event) => event.type === 'rate_limit_exceeded' || event.type === 'privilege_denied').length,
            byType: [...byType.entries()].map(([type, count]) => ({ type, count })),
            bySeverity: [...bySeverity.entries()].map(([severity, count]) => ({ severity, count })),
            topIps: [...ips.entries()].map(([ipAddress, count]) => ({ ipAddress, count })),
            topRoutes: [...routes.entries()].map(([route, count]) => ({ route, count })),
            uniqueIpCount: new Set(mockSecurityEvents.map((event) => event.ipAddress).filter(Boolean)).size,
            affectedAccountCount: new Set(mockSecurityEvents.map((event) => event.userId).filter(Boolean)).size,
            repeatedFailedLoginCount: mockSecurityEvents.filter((event) => event.type === 'login_failed' && (event.failedLoginAttempts ?? 0) > 1).length,
            requestBursts: [],
            topUserAgents: [{ userAgent: 'AutoCare Hub mock', count: mockSecurityEvents.length }],
            rateLimitEffectiveness: {
                blocked: mockSecurityEvents.filter((event) => event.rateLimitResult === 'blocked').length,
                allowed: mockSecurityEvents.filter((event) => event.rateLimitResult === 'allowed').length,
                notChecked: mockSecurityEvents.filter((event) => event.rateLimitResult === 'not_checked').length,
                blockedSharePercent: 0,
            },
            recentEvents: mockSecurityEvents.slice(0, 12),
        })
    }) },
{ order: 40, handler: http.get('/api/admin/security-center/events', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        const severity = url.searchParams.get('severity')
        const status = url.searchParams.get('status')
        const ip = url.searchParams.get('ip')
        const route = url.searchParams.get('route')
        const actorRole = url.searchParams.get('actorRole')
        const requestId = url.searchParams.get('requestId')
        const authOutcome = url.searchParams.get('authOutcome')
        const rateLimitResult = url.searchParams.get('rateLimitResult')
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!type || event.type === type) &&
            (!severity || event.severity === severity) &&
            (!status || event.status === status) &&
            (!ip || event.ipAddress === ip) &&
            (!route || event.route?.includes(route)) &&
            (!actorRole || event.actorRole === actorRole) &&
            (!requestId || event.requestId === requestId) &&
            (!authOutcome || event.authOutcome === authOutcome) &&
            (!rateLimitResult || event.rateLimitResult === rateLimitResult)
        ))
        return HttpResponse.json({ items: filteredEvents, nextCursor: null })
    }) },
{ order: 41, handler: http.get('/api/admin/security-center/events/export', ({ request }) => {
        const url = new URL(request.url)
        const filters = {
            type: url.searchParams.get('type'),
            severity: url.searchParams.get('severity'),
            status: url.searchParams.get('status'),
            ip: url.searchParams.get('ip'),
            route: url.searchParams.get('route'),
            actorRole: url.searchParams.get('actorRole'),
            requestId: url.searchParams.get('requestId'),
            authOutcome: url.searchParams.get('authOutcome'),
            rateLimitResult: url.searchParams.get('rateLimitResult'),
        }
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!filters.type || event.type === filters.type) &&
            (!filters.severity || event.severity === filters.severity) &&
            (!filters.status || event.status === filters.status) &&
            (!filters.ip || event.ipAddress === filters.ip) &&
            (!filters.route || event.route?.includes(filters.route)) &&
            (!filters.actorRole || event.actorRole === filters.actorRole) &&
            (!filters.requestId || event.requestId === filters.requestId) &&
            (!filters.authOutcome || event.authOutcome === filters.authOutcome) &&
            (!filters.rateLimitResult || event.rateLimitResult === filters.rateLimitResult)
        )).slice(0, 100)
        const cell = (value: unknown) => `"${String(value ?? '').replace(/^[=+\-@]/, (prefix) => `'${prefix}`).replaceAll('"', '""')}"`
        const header = ['createdAt', 'type', 'severity', 'status', 'ipAddress', 'requestId', 'method', 'route', 'statusCode', 'actorRole', 'authOutcome', 'rateLimitResult', 'requestSizeBytes', 'reasonCode', 'proxyProvenance', 'userAgent', 'metadata']
        const rows = filteredEvents.map((event) => [
            event.createdAt, event.type, event.severity, event.status, event.ipAddress, event.requestId,
            event.method, event.route, event.statusCode, event.actorRole, event.authOutcome,
            event.rateLimitResult, event.requestSizeBytes, event.reasonCode, event.proxyProvenance,
            event.userAgent, '[redacted]',
        ])
        const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n'
        return new HttpResponse(csv, {
            headers: {
                'cache-control': 'no-store',
                'content-disposition': `attachment; filename="autocarehub-security-events-${new Date().toISOString().slice(0, 10)}.csv"`,
                'content-type': 'text/csv; charset=utf-8',
            },
        })
    }) },
{ order: 42, handler: http.get('/api/admin/security-center/mitigations', ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get('status') ?? 'active'
        const ipAddress = url.searchParams.get('ipAddress')
        const now = Date.now()
        const items = mockSecurityMitigations
            .map((item) => item.status === 'active' && item.revokedAt === null && Date.parse(item.expiresAt) <= now
                ? { ...item, status: 'expired' as const }
                : item)
            .filter((item) => (
                item.status === status &&
                (!ipAddress || item.displayValue === ipAddress)
            ))
        return HttpResponse.json(items)
    }) },
{ order: 43, handler: http.post('/api/admin/security-center/mitigations', async ({ request }) => {
        const body = await request.json() as {
            kind?: 'ip_block'
            ipAddress?: string
            reason?: string
            ttlMinutes?: number
        }
        const ttlMinutes = body.ttlMinutes
        if (!body.ipAddress || !body.reason || typeof ttlMinutes !== 'number' || !Number.isInteger(ttlMinutes)) {
            return invalidMockBodyResponse()
        }
        const now = new Date()
        const mitigation: MockSecurityMitigation = {
            id: `mock-mitigation-${Date.now()}`,
            kind: 'ip_block',
            displayValue: body.ipAddress.trim(),
            reason: body.reason.trim(),
            expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
            revokedAt: null,
            createdBy: 'user-admin-1',
            revokedBy: null,
            createdAt: now.toISOString(),
            status: 'active',
        }
        mockSecurityMitigations.unshift(mitigation)
        return HttpResponse.json(mitigation)
    }) },
{ order: 44, handler: http.delete('/api/admin/security-center/mitigations/:id', ({ params }) => {
        const mitigation = mockSecurityMitigations.find((item) => item.id === params.id)
        if (!mitigation) return HttpResponse.json({ message: 'Security mitigation not found.' }, { status: 404 })
        mitigation.status = 'revoked'
        mitigation.revokedAt = new Date().toISOString()
        mitigation.revokedBy = 'user-admin-1'
        return HttpResponse.json(mitigation)
    }) },
{ order: 45, handler: http.patch('/api/admin/security-center/mitigations/:id', async ({ params, request }) => {
        const mitigation = mockSecurityMitigations.find((item) => item.id === params.id)
        if (!mitigation) return HttpResponse.json({ message: 'Security mitigation not found.' }, { status: 404 })
        const body = await request.json() as { extensionMinutes?: number }
        const extensionMinutes = body.extensionMinutes
        if (
            mitigation.status !== 'active'
            || mitigation.revokedAt !== null
            || typeof extensionMinutes !== 'number'
            || !Number.isInteger(extensionMinutes)
            || extensionMinutes < 1
            || extensionMinutes > 1_440
        ) {
            return invalidMockBodyResponse()
        }
        const nextExpiry = Date.parse(mitigation.expiresAt) + extensionMinutes * 60_000
        if (nextExpiry > Date.now() + 1_440 * 60_000) {
            return HttpResponse.json({ message: 'The extension would exceed the 24-hour recovery window.' }, { status: 409 })
        }
        mitigation.expiresAt = new Date(nextExpiry).toISOString()
        return HttpResponse.json(mitigation, { headers: { 'cache-control': 'no-store' } })
    }) },
{ order: 46, handler: http.post('/api/admin/security-center/users/:id/revoke-sessions', ({ params }) => (
        HttpResponse.json(
            {
                userId: params.id,
                revokedAt: new Date().toISOString(),
            },
            { headers: { 'cache-control': 'no-store' } },
        )
    )) },
{ order: 47, handler: http.get('/api/admin/security-center/events/:id', ({ params }) => {
        const event = mockSecurityEvents.find((item) => item.id === params.id)
        return event
            ? HttpResponse.json(event)
            : HttpResponse.json({ message: 'Security event not found.' }, { status: 404 })
    }) },
{ order: 48, handler: http.patch('/api/admin/security-center/events/:id/status', async ({ params, request }) => {
        const event = mockSecurityEvents.find((item) => item.id === params.id)
        if (!event) return HttpResponse.json({ message: 'Security event not found.' }, { status: 404 })
        const body = await request.json() as {
            status: MockSecurityEvent['status']
            operatorNote?: string
            assigneeId?: string | null
        }
        event.status = body.status
        const action = {
            status: body.status === 'open' ? 'acknowledged' : body.status,
            operatorNote: body.operatorNote ?? null,
            actorId: 'user-admin-1',
            assigneeId: body.assigneeId === undefined ? event.assigneeId : body.assigneeId,
            createdAt: new Date().toISOString(),
        }
        event.assigneeId = action.assigneeId
        event.lastAction = action
        event.actionTimeline.unshift({ id: `mock-security-action-${Date.now()}`, ...action })
        return HttpResponse.json(event)
    }) },
{ order: 49, handler: http.get('/api/admin/system-incidents', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.trim().toLowerCase()
        const status = url.searchParams.get('status')
        const filteredIncidents = mockSystemIncidents.filter((incident) => (
            (!search || incident.title.toLowerCase().includes(search)) &&
            (!status || incident.status === status)
        ))

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredIncidents, nextCursor: null })
        }

        return HttpResponse.json(filteredIncidents)
    }) },
{ order: 50, handler: http.get('/api/admin/outbox/health', () => HttpResponse.json({
        counts: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            dead_letter: 0,
        },
        abandonedCount: 0,
        deadLetterCount: 0,
        failedEvents: [],
    })) },
{ order: 51, handler: http.get('/api/admin/operations/overview', () => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) {
            return HttpResponse.json({ message: 'Only admins can access the operations overview.' }, { status: 403 })
        }

        const openIncidents = mockSystemIncidents.filter((incident) => incident.status === 'open')
        const openSecurityEvents = mockSecurityEvents.filter((event) => event.status === 'open')

        return HttpResponse.json({
            generatedAt: new Date().toISOString(),
            overallStatus: 'healthy',
            database: {
                status: 'connected',
                latencyMs: 5,
                schema: {
                    status: 'complete',
                    reasonCodes: [],
                    missingTables: [],
                    missingColumns: [],
                    missingIndexes: [],
                    missingConstraints: [],
                    missingMigrations: [],
                    aheadMigrations: [],
                },
                pool: {
                    status: 'ok',
                    total: 10,
                    idle: 8,
                    active: 2,
                    waiting: 0,
                    activeRatio: 0.2,
                    reasons: [],
                    thresholds: { maxActiveRatio: 0.85, maxWaitingRequests: 0 },
                },
            },
            backend: {
                signals: {
                    available: true,
                    openIncidents: openIncidents.length,
                    criticalIncidents: openIncidents.filter((incident) => incident.severity === 'critical').length,
                    openSecurityEvents: openSecurityEvents.length,
                    highSecurityEvents: mockSecurityEvents.filter((event) => event.severity === 'high').length,
                    criticalSecurityEvents: mockSecurityEvents.filter((event) => event.severity === 'critical').length,
                    blockedSecuritySignals: mockSecurityEvents.filter((event) => event.type === 'rate_limit_exceeded' || event.type === 'privilege_denied').length,
                },
                redis: { status: 'disabled', latencyMs: 0 },
                outbox: {
                    status: 'ok',
                    latencyMs: 2,
                    counts: { pending: 0, processing: 0, completed: 0, failed: 0, dead_letter: 0 },
                    activeCount: 0,
                    failedCount: 0,
                    abandonedCount: 0,
                    deadLetterCount: 0,
                    oldestAgeMs: null,
                    readiness: { ok: true, reasons: [], thresholds: { maxPending: 1_000, maxDeadLetter: 0, maxOldestAgeMs: 900_000 } },
                },
                storage: { provider: 'filesystem', antivirusMode: 'off' },
                runtime: {
                    nodeEnv: 'development',
                    runtimeMode: 'local',
                    mailMode: 'logger',
                    redisEnabled: false,
                    metricsTokenConfigured: false,
                    databaseSslRejectUnauthorized: false,
                    deploymentMarket: 'ru',
                    attachmentStorageProvider: 'filesystem',
                    attachmentAntivirusMode: 'off',
                },
                metrics: { gauges: [], counters: [], histograms: [], seriesCount: 0 },
            },
        }, { headers: { 'cache-control': 'no-store' } })
    }) },
{ order: 52, handler: http.patch('/api/admin/system-incidents/:id/status', async ({ params, request }) => {
        const body = await request.json() as { status: 'open' | 'acknowledged' | 'resolved' }
        const incident = mockSystemIncidents.find((item) => item.id === params.id)

        if (!incident) {
            return HttpResponse.json({ message: 'System incident not found.' }, { status: 404 })
        }

        incident.status = body.status
        incident.acknowledgedAt = body.status === 'acknowledged'
            ? new Date().toISOString()
            : incident.acknowledgedAt
        incident.resolvedAt = body.status === 'resolved'
            ? new Date().toISOString()
            : null

        return HttpResponse.json(incident)
    }) }
]
