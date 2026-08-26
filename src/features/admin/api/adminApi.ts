import { baseApi } from '@/shared/api/baseApi'
import type { CursorPage, CursorQuery } from '@/shared/api/cursorPagination'
import {
    normalizeAuditLogListResponse,
    normalizeAuditLogPageResponse,
    normalizeSecurityEventListResponse,
    normalizeSecurityEventPageResponse,
    normalizeSecurityCenterEventPageResponse,
    normalizeSecurityCenterEventResponse,
    normalizeSecurityCenterSummaryResponse,
    normalizeSecurityCenterExportResponse,
    normalizeSecurityMitigationListResponse,
    normalizeSecurityMitigationResponse,
    normalizeSecuritySessionRevocationResponse,
    normalizeOutboxHealthResponse,
    normalizeSystemIncidentListResponse,
    normalizeSystemIncidentPageResponse,
    normalizeSystemIncidentResponse,
} from '../lib/admin-response-schema'

type AuditLogsQuery = CursorQuery & {
    search?: string | undefined
    action?: string | undefined
    targetType?: string | undefined
    actorId?: string | undefined
}

type SystemIncidentsQuery = CursorQuery & {
    search?: string | undefined
    type?: SystemIncident['type'] | undefined
    severity?: SystemIncident['severity'] | undefined
    status?: SystemIncidentStatus | undefined
}

type SecurityEventsQuery = CursorQuery & {
    type?: SecurityEvent['type'] | undefined
    userId?: string | undefined
}

export type SecurityCenterEventsQuery = CursorQuery & {
    type?: SecurityCenterEvent['type'] | undefined
    severity?: SecurityCenterEvent['severity'] | undefined
    status?: SecurityCenterEvent['status'] | undefined
    ip?: string | undefined
    route?: string | undefined
    actorRole?: SecurityCenterEvent['actorRole'] | undefined
    requestId?: string | undefined
    authOutcome?: SecurityCenterEvent['authOutcome'] | undefined
    rateLimitResult?: SecurityCenterEvent['rateLimitResult'] | undefined
    from?: string | undefined
    to?: string | undefined
}

export type SecurityCenterExportQuery = Omit<SecurityCenterEventsQuery, 'cursor'>

export type SecurityMitigationsQuery = CursorQuery & {
    status?: SecurityMitigation['status'] | undefined
    ipAddress?: string | undefined
    kind?: SecurityMitigation['kind'] | undefined
}

export type AuditLogActor = {
    id: string
    name: string
}

export type KnownAuditLogAction =
    | 'admin_created'
    | 'cabinet_status_updated'
    | 'autocare_provider_status_updated'
    | 'autocare_provider_change_request_decided'
    | 'autocare_catalog_gap_request_decided'
    | 'autocare_market_updated'
    | 'autocare_market_country_created'
    | 'autocare_market_country_updated'
    | 'autocare_market_created'
    | 'autocare_market_zone_created'
    | 'autocare_market_zone_updated'
    | 'autocare_service_definition_updated'
    | 'autocare_bonus_granted'
    | 'autocare_appeal_decided'
    | 'autocare_moderation_evidence_decided'
    | 'chat_report_moderated'
    | 'system_incident_status_updated'
    | 'promo_subscription_issued'
    | 'review_deleted'
    | 'review_moderated'
    | 'subscription_created'
    | 'user_role_updated'
    | 'user_status_updated'
    | 'login_failed'
    | 'account_locked'
    | 'refresh_token_reuse'
    | 'outbox_retried'
    | 'outbox_dead_lettered'
    | 'oauth_identity_linked'
    | 'oauth_identity_unlinked'
    | 'account_deletion_requested'
    | 'account_deletion_cancelled'
    | 'account_deletion_completed'
    | 'security_events_viewed'
    | 'security_center_report_exported'
    | 'security_mitigation_created'
    | 'security_mitigation_extended'
    | 'security_mitigation_revoked'
    | 'security_user_sessions_revoked'

export type AuditLogAction = KnownAuditLogAction | (string & {})

export type SecuritySessionRevocation = {
    userId: string
    revokedAt: string
}

export type AuditLog = {
    id: string
    actor: AuditLogActor | null
    action: AuditLogAction
    targetId: string | null
    targetType: string | null
    metadata: Record<string, unknown>
    ipAddress: string | null
    createdAt: string
}

export type SystemIncidentStatus = 'open' | 'acknowledged' | 'resolved'

export type SystemIncident = {
    id: string
    type: 'server_error' | 'health_check' | 'background_job'
    severity: 'warning' | 'critical'
    status: SystemIncidentStatus
    title: string
    requestId: string | null
    metadata: Record<string, unknown>
    occurrenceCount: number
    firstOccurredAt: string
    lastOccurredAt: string
    acknowledgedAt: string | null
    resolvedAt: string | null
}

export type SecurityEvent = {
    id: string
    userId: string | null
    type: 'login_failed' | 'account_locked' | 'refresh_token_reuse'
    failedLoginAttempts: number | null
    lockedUntil: string | null
    ipAddress: string | null
    userAgent: string | null
    correlationId: string | null
    createdAt: string
}

export type SecurityEventSeverity = 'info' | 'warning' | 'high' | 'critical'
export type SecurityEventStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
export type SecurityCenterEvent = {
    id: string
    userId: string | null
    type: 'login_failed' | 'account_locked' | 'refresh_token_reuse' | 'rate_limit_exceeded' | 'invalid_token' | 'csrf_violation' | 'route_scan' | 'malformed_request' | 'oversized_request' | 'privilege_denied' | 'webhook_abuse' | 'mutation_burst'
    severity: SecurityEventSeverity
    status: SecurityEventStatus
    assigneeId: string | null
    failedLoginAttempts: number | null
    lockedUntil: string | null
    ipAddress: string | null
    userAgent: string | null
    correlationId: string | null
    requestId: string | null
    method: string | null
    route: string | null
    statusCode: number | null
    actorRole: 'client' | 'owner' | 'admin' | 'super_admin' | null
    authOutcome: 'unknown' | 'anonymous' | 'authenticated' | 'failed'
    rateLimitResult: 'not_checked' | 'allowed' | 'blocked'
    requestSizeBytes: number | null
    reasonCode: string | null
    proxyProvenance: 'unknown' | 'direct' | 'trusted_proxy' | 'forwarded_header_untrusted'
    metadata: Record<string, unknown>
    createdAt: string
    lastAction: {
        status: Exclude<SecurityEventStatus, 'open'>
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    } | null
    actionTimeline: Array<{
        id: string
        status: Exclude<SecurityEventStatus, 'open'>
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    }>
    relatedAuditLogs: Array<{
        id: string
        action: string
        targetType: string | null
        correlationId: string | null
        createdAt: string
    }>
    relatedSystemIncidents: Array<{
        id: string
        type: 'server_error' | 'health_check' | 'background_job'
        severity: 'warning' | 'critical'
        status: 'open' | 'acknowledged' | 'resolved'
        title: string
        requestId: string | null
        occurrenceCount: number
        firstOccurredAt: string
        lastOccurredAt: string
    }>
}

export type SecurityCenterSummary = {
    windowMinutes: number
    sampled: boolean
    totalEvents: number
    openEvents: number
    highSeverityEvents: number
    criticalSeverityEvents: number
    blockedSignals: number
    byType: Array<{ type: SecurityCenterEvent['type']; count: number }>
    bySeverity: Array<{ severity: SecurityEventSeverity; count: number }>
    topIps: Array<{ ipAddress: string; count: number }>
    topRoutes: Array<{ route: string; count: number }>
    uniqueIpCount: number
    affectedAccountCount: number
    repeatedFailedLoginCount: number
    requestBursts: Array<{ windowStart: string; count: number }>
    topUserAgents: Array<{ userAgent: string; count: number }>
    rateLimitEffectiveness: {
        blocked: number
        allowed: number
        notChecked: number
        blockedSharePercent: number
    }
    recentEvents: SecurityCenterEvent[]
}

export type SecurityMitigation = {
    id: string
    kind: 'ip_block'
    displayValue: string
    reason: string
    expiresAt: string
    revokedAt: string | null
    createdBy: string
    revokedBy: string | null
    createdAt: string
    status: 'active' | 'expired' | 'revoked'
}

export type OutboxHealth = {
    counts: Record<string, number>
    abandonedCount: number
    deadLetterCount: number
    failedEvents: Array<{
        id: string
        type: string
        idempotencyKey: string | null
        status: string
        attempts: number
        availableAt: string
        lockedAt: string | null
        processedAt: string | null
        lastError: string | null
        createdAt: string
    }>
}

export const adminApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getAuditLogs: build.query<AuditLog[], void>({
            query: () => '/admin/audit-logs',
            transformResponse: normalizeAuditLogListResponse,
            providesTags: ['AuditLogs'],
        }),
        getAuditLogsPage: build.query<CursorPage<AuditLog>, AuditLogsQuery>({
            query: (query) => ({
                url: '/admin/audit-logs',
                params: query,
            }),
            transformResponse: normalizeAuditLogPageResponse,
            providesTags: ['AuditLogs'],
        }),
        getSystemIncidents: build.query<SystemIncident[], void>({
            query: () => '/admin/system-incidents',
            transformResponse: normalizeSystemIncidentListResponse,
            providesTags: ['SystemIncidents'],
        }),
        getSystemIncidentsPage: build.query<CursorPage<SystemIncident>, SystemIncidentsQuery>({
            query: (query) => ({
                url: '/admin/system-incidents',
                params: query,
            }),
            transformResponse: normalizeSystemIncidentPageResponse,
            providesTags: ['SystemIncidents'],
        }),
        getOutboxHealth: build.query<OutboxHealth, void>({
            query: () => '/admin/outbox/health',
            transformResponse: normalizeOutboxHealthResponse,
            providesTags: ['SystemIncidents'],
        }),
        getSecurityEvents: build.query<SecurityEvent[], void>({
            query: () => '/admin/security-events',
            transformResponse: normalizeSecurityEventListResponse,
            providesTags: ['SecurityEvents'],
        }),
        getSecurityEventsPage: build.query<CursorPage<SecurityEvent>, SecurityEventsQuery>({
            query: (query) => ({
                url: '/admin/security-events',
                params: query,
            }),
            transformResponse: normalizeSecurityEventPageResponse,
            providesTags: ['SecurityEvents'],
        }),
        getSecurityCenterSummary: build.query<SecurityCenterSummary, number | void>({
            query: (windowMinutes = 1_440) => ({
                url: '/admin/security-center/summary',
                params: { windowMinutes },
            }),
            transformResponse: normalizeSecurityCenterSummaryResponse,
            providesTags: ['SecurityEvents'],
        }),
        getSecurityCenterEventsPage: build.query<CursorPage<SecurityCenterEvent>, SecurityCenterEventsQuery>({
            query: (query) => ({
                url: '/admin/security-center/events',
                params: query,
            }),
            transformResponse: normalizeSecurityCenterEventPageResponse,
            providesTags: ['SecurityEvents'],
        }),
        getSecurityCenterExport: build.query<Blob, SecurityCenterExportQuery>({
            query: (query) => ({
                url: '/admin/security-center/events/export',
                params: query,
                responseHandler: (response) => response.blob(),
            }),
            transformResponse: normalizeSecurityCenterExportResponse,
            providesTags: [],
        }),
        getSecurityCenterEvent: build.query<SecurityCenterEvent, string>({
            query: (id) => `/admin/security-center/events/${id}`,
            transformResponse: normalizeSecurityCenterEventResponse,
            providesTags: ['SecurityEvents'],
        }),
        updateSystemIncidentStatus: build.mutation<
            SystemIncident,
            { id: string; status: SystemIncidentStatus }
        >({
            query: ({ id, status }) => ({
                url: `/admin/system-incidents/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            transformResponse: normalizeSystemIncidentResponse,
            invalidatesTags: ['SystemIncidents'],
        }),
        updateSecurityCenterEventStatus: build.mutation<
            SecurityCenterEvent,
            { id: string; status: Exclude<SecurityEventStatus, 'open'>; operatorNote?: string; assigneeId?: string | null }
        >({
            query: ({ id, status, operatorNote, assigneeId }) => ({
                url: `/admin/security-center/events/${id}/status`,
                method: 'PATCH',
                body: { status, operatorNote, assigneeId },
            }),
            transformResponse: normalizeSecurityCenterEventResponse,
            invalidatesTags: ['SecurityEvents'],
        }),
        getSecurityMitigations: build.query<SecurityMitigation[], SecurityMitigationsQuery | void>({
            query: (query) => ({
                url: '/admin/security-center/mitigations',
                params: query ?? {},
            }),
            transformResponse: normalizeSecurityMitigationListResponse,
            providesTags: ['SecurityEvents'],
        }),
        createSecurityMitigation: build.mutation<SecurityMitigation, {
            kind?: SecurityMitigation['kind']
            ipAddress: string
            reason: string
            ttlMinutes: number
        }>({
            query: (body) => ({
                url: '/admin/security-center/mitigations',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeSecurityMitigationResponse,
            invalidatesTags: ['SecurityEvents'],
        }),
        extendSecurityMitigation: build.mutation<SecurityMitigation, { id: string; extensionMinutes: number }>({
            query: ({ id, extensionMinutes }) => ({
                url: `/admin/security-center/mitigations/${id}`,
                method: 'PATCH',
                body: { extensionMinutes },
            }),
            transformResponse: normalizeSecurityMitigationResponse,
            invalidatesTags: ['SecurityEvents'],
        }),
        revokeSecurityMitigation: build.mutation<SecurityMitigation, string>({
            query: (id) => ({
                url: `/admin/security-center/mitigations/${id}`,
                method: 'DELETE',
            }),
            transformResponse: normalizeSecurityMitigationResponse,
            invalidatesTags: ['SecurityEvents'],
        }),
        revokeSecurityCenterUserSessions: build.mutation<SecuritySessionRevocation, string>({
            query: (userId) => ({
                url: `/admin/security-center/users/${userId}/revoke-sessions`,
                method: 'POST',
            }),
            transformResponse: normalizeSecuritySessionRevocationResponse,
            invalidatesTags: ['SecurityEvents', 'User'],
        }),
    }),
})

export const {
    useGetAuditLogsQuery,
    useGetAuditLogsPageQuery,
    useLazyGetAuditLogsPageQuery,
    useGetSystemIncidentsQuery,
    useGetSystemIncidentsPageQuery,
    useLazyGetSystemIncidentsPageQuery,
    useGetOutboxHealthQuery,
    useGetSecurityEventsQuery,
    useGetSecurityEventsPageQuery,
    useLazyGetSecurityEventsPageQuery,
    useGetSecurityCenterSummaryQuery,
    useGetSecurityCenterEventsPageQuery,
    useLazyGetSecurityCenterEventsPageQuery,
    useLazyGetSecurityCenterExportQuery,
    useGetSecurityCenterEventQuery,
    useUpdateSystemIncidentStatusMutation,
    useUpdateSecurityCenterEventStatusMutation,
    useGetSecurityMitigationsQuery,
    useCreateSecurityMitigationMutation,
    useExtendSecurityMitigationMutation,
    useRevokeSecurityMitigationMutation,
    useRevokeSecurityCenterUserSessionsMutation,
} = adminApi
