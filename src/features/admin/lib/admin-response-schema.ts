import { z } from 'zod'

import type { CursorPage } from '@/shared/api/cursorPagination'
import type {
    OutboxHealth,
    AuditLog,
    SecurityCenterEvent,
    SecurityCenterSummary,
    SecurityMitigation,
    SecuritySessionRevocation,
    SecurityEvent,
    SystemIncident,
} from '../api/adminApi'

const metadataSchema = z.record(z.string(), z.unknown())

const auditLogSchema = z.object({
    id: z.string(),
    actor: z.object({ id: z.string(), name: z.string() }).nullable(),
    action: z.string().trim().min(1),
    targetId: z.string().nullable(),
    targetType: z.string().nullable(),
    metadata: metadataSchema,
    ipAddress: z.string().nullable(),
    createdAt: z.string(),
}) satisfies z.ZodType<AuditLog>

const systemIncidentSchema = z.object({
    id: z.string(),
    type: z.enum(['server_error', 'health_check', 'background_job']),
    severity: z.enum(['warning', 'critical']),
    status: z.enum(['open', 'acknowledged', 'resolved']),
    title: z.string(),
    requestId: z.string().nullable(),
    metadata: metadataSchema,
    occurrenceCount: z.number().int().nonnegative(),
    firstOccurredAt: z.string(),
    lastOccurredAt: z.string(),
    acknowledgedAt: z.string().nullable(),
    resolvedAt: z.string().nullable(),
}) satisfies z.ZodType<SystemIncident>

const outboxHealthSchema = z.object({
    counts: z.record(z.string(), z.number().int().nonnegative()),
    abandonedCount: z.number().int().nonnegative(),
    deadLetterCount: z.number().int().nonnegative(),
    failedEvents: z.array(z.object({
        id: z.string(),
        type: z.string(),
        idempotencyKey: z.string().nullable(),
        status: z.string(),
        attempts: z.number().int().nonnegative(),
        availableAt: z.string(),
        lockedAt: z.string().nullable(),
        processedAt: z.string().nullable(),
        lastError: z.string().nullable(),
        createdAt: z.string(),
    })).max(100),
}) satisfies z.ZodType<OutboxHealth>

const securityEventSchema = z.object({
    id: z.string(),
    userId: z.string().nullable(),
    type: z.enum(['login_failed', 'account_locked', 'refresh_token_reuse']),
    failedLoginAttempts: z.number().int().nonnegative().nullable(),
    lockedUntil: z.string().nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    correlationId: z.string().nullable(),
    createdAt: z.string(),
}) satisfies z.ZodType<SecurityEvent>

const securityCenterEventSchema = z.object({
    id: z.string(),
    userId: z.string().nullable(),
    type: z.enum(['login_failed', 'account_locked', 'refresh_token_reuse', 'rate_limit_exceeded', 'invalid_token', 'csrf_violation', 'route_scan', 'malformed_request', 'oversized_request', 'privilege_denied', 'webhook_abuse', 'mutation_burst']),
    severity: z.enum(['info', 'warning', 'high', 'critical']),
    status: z.enum(['open', 'acknowledged', 'investigating', 'resolved', 'suppressed']),
    assigneeId: z.string().nullable(),
    failedLoginAttempts: z.number().int().nonnegative().nullable(),
    lockedUntil: z.string().nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    correlationId: z.string().nullable(),
    requestId: z.string().nullable(),
    method: z.string().nullable(),
    route: z.string().nullable(),
    statusCode: z.number().int().nullable(),
    actorRole: z.enum(['client', 'owner', 'admin', 'super_admin']).nullable(),
    authOutcome: z.enum(['unknown', 'anonymous', 'authenticated', 'failed']),
    rateLimitResult: z.enum(['not_checked', 'allowed', 'blocked']),
    requestSizeBytes: z.number().int().nonnegative().nullable(),
    reasonCode: z.string().nullable(),
    proxyProvenance: z.enum(['unknown', 'direct', 'trusted_proxy', 'forwarded_header_untrusted']),
    metadata: metadataSchema,
    createdAt: z.string(),
    lastAction: z.object({
        status: z.enum(['acknowledged', 'investigating', 'resolved', 'suppressed']),
        operatorNote: z.string().nullable(),
        actorId: z.string(),
        assigneeId: z.string().nullable(),
        createdAt: z.string(),
    }).nullable(),
    actionTimeline: z.array(z.object({
        id: z.string(),
        status: z.enum(['acknowledged', 'investigating', 'resolved', 'suppressed']),
        operatorNote: z.string().nullable(),
        actorId: z.string(),
        assigneeId: z.string().nullable(),
        createdAt: z.string(),
    })).max(20),
    relatedAuditLogs: z.array(z.object({
        id: z.string(),
        action: z.string(),
        targetType: z.string().nullable(),
        correlationId: z.string().nullable(),
        createdAt: z.string(),
    })).max(50),
    relatedSystemIncidents: z.array(z.object({
        id: z.string(),
        type: z.enum(['server_error', 'health_check', 'background_job']),
        severity: z.enum(['warning', 'critical']),
        status: z.enum(['open', 'acknowledged', 'resolved']),
        title: z.string(),
        requestId: z.string().nullable(),
        occurrenceCount: z.number().int().nonnegative(),
        firstOccurredAt: z.string(),
        lastOccurredAt: z.string(),
    })).max(20),
}) satisfies z.ZodType<SecurityCenterEvent>

const securityMitigationSchema = z.object({
    id: z.string(),
    kind: z.literal('ip_block'),
    displayValue: z.string().min(3).max(64),
    reason: z.string().min(1).max(500),
    expiresAt: z.string(),
    revokedAt: z.string().nullable(),
    createdBy: z.string(),
    revokedBy: z.string().nullable(),
    createdAt: z.string(),
    status: z.enum(['active', 'expired', 'revoked']),
}) satisfies z.ZodType<SecurityMitigation>

const securitySessionRevocationSchema = z.object({
    userId: z.string().min(1),
    revokedAt: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<SecuritySessionRevocation>

const securityCenterSummarySchema = z.object({
    windowMinutes: z.number().int().positive(),
    sampled: z.boolean(),
    totalEvents: z.number().int().nonnegative(),
    openEvents: z.number().int().nonnegative(),
    highSeverityEvents: z.number().int().nonnegative(),
    criticalSeverityEvents: z.number().int().nonnegative(),
    blockedSignals: z.number().int().nonnegative(),
    byType: z.array(z.object({ type: securityCenterEventSchema.shape.type, count: z.number().int().nonnegative() })),
    bySeverity: z.array(z.object({ severity: securityCenterEventSchema.shape.severity, count: z.number().int().nonnegative() })),
    topIps: z.array(z.object({ ipAddress: z.string(), count: z.number().int().nonnegative() })),
    topRoutes: z.array(z.object({ route: z.string(), count: z.number().int().nonnegative() })),
    uniqueIpCount: z.number().int().nonnegative(),
    affectedAccountCount: z.number().int().nonnegative(),
    repeatedFailedLoginCount: z.number().int().nonnegative(),
    requestBursts: z.array(z.object({ windowStart: z.string(), count: z.number().int().nonnegative() })).max(8),
    topUserAgents: z.array(z.object({ userAgent: z.string().max(96), count: z.number().int().nonnegative() })).max(8),
    rateLimitEffectiveness: z.object({
        blocked: z.number().int().nonnegative(),
        allowed: z.number().int().nonnegative(),
        notChecked: z.number().int().nonnegative(),
        blockedSharePercent: z.number().int().min(0).max(100),
    }),
    recentEvents: z.array(securityCenterEventSchema),
}) satisfies z.ZodType<SecurityCenterSummary>

function normalizePage<T>(value: unknown, itemSchema: z.ZodType<T>): CursorPage<T> {
    if (Array.isArray(value)) {
        return { items: z.array(itemSchema).parse(value), nextCursor: null }
    }

    const pageSchema = z.object({
        items: z.array(itemSchema),
        nextCursor: z.string().nullable(),
    })

    return pageSchema.parse(value)
}

export function normalizeAuditLogListResponse(value: unknown): AuditLog[] {
    return z.array(auditLogSchema).parse(value)
}

export function normalizeAuditLogPageResponse(value: unknown): CursorPage<AuditLog> {
    return normalizePage(value, auditLogSchema)
}

export function normalizeSystemIncidentListResponse(value: unknown): SystemIncident[] {
    return z.array(systemIncidentSchema).parse(value)
}

export function normalizeSystemIncidentPageResponse(value: unknown): CursorPage<SystemIncident> {
    return normalizePage(value, systemIncidentSchema)
}

export function normalizeOutboxHealthResponse(value: unknown): OutboxHealth {
    return outboxHealthSchema.parse(value)
}

export function normalizeSystemIncidentResponse(value: unknown): SystemIncident {
    return systemIncidentSchema.parse(value)
}

export function normalizeSecurityEventListResponse(value: unknown): SecurityEvent[] {
    return z.array(securityEventSchema).parse(value)
}

export function normalizeSecurityEventPageResponse(value: unknown): CursorPage<SecurityEvent> {
    return normalizePage(value, securityEventSchema)
}

export function normalizeSecurityCenterEventResponse(value: unknown): SecurityCenterEvent {
    return securityCenterEventSchema.parse(value)
}

export function normalizeSecurityCenterEventPageResponse(value: unknown): CursorPage<SecurityCenterEvent> {
    return normalizePage(value, securityCenterEventSchema)
}

export function normalizeSecurityCenterSummaryResponse(value: unknown): SecurityCenterSummary {
    return securityCenterSummarySchema.parse(value)
}

export function normalizeSecurityCenterExportResponse(value: unknown): Blob {
    if (typeof Blob === 'undefined' || !(value instanceof Blob)) {
        throw new Error('Security Center export response must be a Blob.')
    }

    return value
}

export function normalizeSecurityMitigationListResponse(value: unknown): SecurityMitigation[] {
    return z.array(securityMitigationSchema).max(100).parse(value)
}

export function normalizeSecurityMitigationResponse(value: unknown): SecurityMitigation {
    return securityMitigationSchema.parse(value)
}

export function normalizeSecuritySessionRevocationResponse(value: unknown): SecuritySessionRevocation {
    return securitySessionRevocationSchema.parse(value)
}
