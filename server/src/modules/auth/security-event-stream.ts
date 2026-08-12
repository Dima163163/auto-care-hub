import type { FastifyRequest } from 'fastify'
import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventSeverity,
    SecurityEventEntity,
    SecurityEventProxyProvenance,
    SecurityEventRateLimitResult,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    MAX_REQUEST_CORRELATION_ID_LENGTH,
    MAX_REQUEST_IP_LENGTH,
    MAX_REQUEST_USER_AGENT_LENGTH,
    normalizeRequestHeader,
} from '../../shared/http/request-header-policy.js'
import { MAX_AUDIT_METADATA_BYTES, isWithinUtf8ByteLimit } from '../../shared/security/request-limits.js'
import { logWarn } from '../../shared/observability/logger.js'
import { metrics } from '../../shared/observability/metrics.js'
import { sanitizeLogMetadata } from '../../shared/observability/sensitive-data.js'
import { recordSystemIncidentSafely } from '../admin/system-incidents.service.js'
import { SystemIncidentSeverity, SystemIncidentType } from '../../entities/system-incident/system-incident.entity.js'
import { observeSecurityAlert } from '../admin/security-alert-policy.js'

type RecordSecurityEventInput = {
    userId?: string | null
    actorRole?: UserRole | null
    type: SecurityEventType
    failedLoginAttempts?: number | null
    lockedUntil?: Date | null
    request?: FastifyRequest
    ipAddress?: string | null
    userAgent?: string | null
    correlationId?: string | null
    severity?: SecurityEventSeverity
    method?: string | null
    route?: string | null
    statusCode?: number | null
    requestId?: string | null
    authOutcome?: SecurityEventAuthOutcome
    rateLimitResult?: SecurityEventRateLimitResult
    requestSizeBytes?: number | null
    reasonCode?: string | null
    proxyProvenance?: SecurityEventProxyProvenance
    metadata?: Record<string, unknown>
    manager?: EntityManager
}

const MAX_SECURITY_EVENT_METHOD_LENGTH = 16
const MAX_SECURITY_EVENT_ROUTE_LENGTH = 240
const MAX_SECURITY_EVENT_REASON_CODE_LENGTH = 96
const MAX_SECURITY_EVENT_REQUEST_SIZE_BYTES = 50_000_000

function getHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value.join(',') : value ?? ''
}

function getProxyProvenance(request: FastifyRequest | undefined) {
    if (!request) return SecurityEventProxyProvenance.Unknown

    const hasForwardedHeader = Boolean(
        getHeaderValue(request.headers['x-forwarded-for']) ||
        getHeaderValue(request.headers.forwarded),
    )
    if (!hasForwardedHeader) return SecurityEventProxyProvenance.Direct

    const requestWithIps = request as FastifyRequest & { ips?: unknown }
    return Array.isArray(requestWithIps.ips) && requestWithIps.ips.length > 1
        ? SecurityEventProxyProvenance.TrustedProxy
        : SecurityEventProxyProvenance.ForwardedHeaderUntrusted
}

function getRequestSizeBytes(request: FastifyRequest | undefined) {
    if (!request) return null

    const rawValue = getHeaderValue(request.headers['content-length']).trim()
    if (!/^\d+$/.test(rawValue)) return null

    const value = Number(rawValue)
    return Number.isSafeInteger(value) && value <= MAX_SECURITY_EVENT_REQUEST_SIZE_BYTES
        ? value
        : null
}

function normalizeReasonCode(value: string | null | undefined) {
    const normalized = value?.trim().toLowerCase().slice(0, MAX_SECURITY_EVENT_REASON_CODE_LENGTH)
    return normalized && /^[a-z0-9][a-z0-9_.:-]*$/.test(normalized) ? normalized : null
}

export function normalizeSecurityEventStreamInput(input: Omit<RecordSecurityEventInput, 'manager'>) {
    if (
        input.failedLoginAttempts !== undefined &&
        input.failedLoginAttempts !== null &&
        (!Number.isSafeInteger(input.failedLoginAttempts) || input.failedLoginAttempts < 1)
    ) {
        throw new Error('Security event login attempts are invalid.')
    }

    if (
        input.requestSizeBytes !== undefined &&
        input.requestSizeBytes !== null &&
        (!Number.isSafeInteger(input.requestSizeBytes) ||
            input.requestSizeBytes < 0 ||
            input.requestSizeBytes > MAX_SECURITY_EVENT_REQUEST_SIZE_BYTES)
    ) {
        throw new Error('Security event request size is invalid.')
    }

    const metadata = sanitizeLogMetadata(input.metadata ?? {})
    const serializedMetadata = JSON.stringify(metadata)
    if (!serializedMetadata || !isWithinUtf8ByteLimit(serializedMetadata, MAX_AUDIT_METADATA_BYTES)) {
        throw new Error('Security event metadata is too large.')
    }

    const method = normalizeRequestHeader(
        input.method ?? input.request?.method,
        MAX_SECURITY_EVENT_METHOD_LENGTH,
    )
    const route = normalizeRequestHeader(
        input.route ?? input.request?.routeOptions?.url,
        MAX_SECURITY_EVENT_ROUTE_LENGTH,
    )

    return {
        userId: input.userId ?? null,
        actorRole: input.actorRole ?? null,
        type: input.type,
        severity: input.severity ?? SecurityEventSeverity.Warning,
        failedLoginAttempts: input.failedLoginAttempts ?? null,
        lockedUntil: input.lockedUntil ?? null,
        ipAddress: normalizeRequestHeader(
            input.ipAddress ?? input.request?.ip,
            MAX_REQUEST_IP_LENGTH,
        ),
        userAgent: normalizeRequestHeader(
            input.userAgent ?? input.request?.headers['user-agent'],
            MAX_REQUEST_USER_AGENT_LENGTH,
        ),
        correlationId: normalizeRequestHeader(
            input.correlationId ?? input.request?.id,
            MAX_REQUEST_CORRELATION_ID_LENGTH,
        ),
        method,
        route,
        statusCode: input.statusCode ?? null,
        requestId: normalizeRequestHeader(
            input.requestId ?? input.request?.id,
            MAX_REQUEST_CORRELATION_ID_LENGTH,
        ),
        authOutcome: input.authOutcome ?? SecurityEventAuthOutcome.Unknown,
        rateLimitResult: input.rateLimitResult ?? SecurityEventRateLimitResult.NotChecked,
        requestSizeBytes: input.requestSizeBytes ?? getRequestSizeBytes(input.request),
        reasonCode: normalizeReasonCode(input.reasonCode),
        proxyProvenance: input.proxyProvenance ?? getProxyProvenance(input.request),
        metadata,
    }
}

export async function recordSecurityEvent(input: RecordSecurityEventInput) {
    const repository = (input.manager ?? AppDataSource.manager).getRepository(SecurityEventEntity)
    const event = await repository.save(repository.create(normalizeSecurityEventStreamInput(input)))

    try {
        metrics.increment('security_events_total', 1, {
            type: event.type,
            severity: event.severity,
        })
        metrics.increment('security_events_rate_limit_total', 1, {
            result: event.rateLimitResult,
        })
        if (
            event.severity === SecurityEventSeverity.High ||
            event.severity === SecurityEventSeverity.Critical
        ) {
            metrics.increment('security_high_severity_events_total', 1, {
                severity: event.severity,
            })
        }

        const alert = observeSecurityAlert({
            type: event.type,
            severity: event.severity,
            route: event.route,
        })
        if (!alert.triggered || !alert.reason) return event

        metrics.increment('security_threshold_alerts_total', 1, {
            type: event.type,
            reason: alert.reason,
        })
        logWarn('Security threshold exceeded', {
            eventType: event.type,
            severity: event.severity,
            route: event.route ?? 'unknown',
            count: alert.count,
            threshold: alert.threshold,
            windowStartedAt: new Date(alert.windowStartedAt).toISOString(),
        })
        void recordSystemIncidentSafely({
            type: SystemIncidentType.ServerError,
            severity: event.severity === SecurityEventSeverity.Critical
                ? SystemIncidentSeverity.Critical
                : SystemIncidentSeverity.Warning,
            title: `Security threshold exceeded: ${event.type}`,
            requestId: event.requestId ?? undefined,
            metadata: {
                eventType: event.type,
                route: event.route ?? 'unknown',
                reason: alert.reason,
                count: alert.count,
                threshold: alert.threshold,
                windowStartedAt: new Date(alert.windowStartedAt).toISOString(),
                ipPresent: event.ipAddress !== null,
            },
        })
    } catch (error) {
        logWarn('Security alert telemetry failed', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
        })
    }

    return event
}

export async function recordSecurityActivitySafely(input: RecordSecurityEventInput) {
    try {
        return await recordSecurityEvent(input)
    } catch {
        return null
    }
}
