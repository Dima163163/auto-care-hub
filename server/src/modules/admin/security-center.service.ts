import { AppDataSource } from '../../database/data-source.js'
import { Brackets, type SelectQueryBuilder } from 'typeorm'
import {
    SecurityEventActionEntity,
    SecurityEventActionStatus,
} from '../../entities/security-event/security-event-action.entity.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventEntity,
    SecurityEventProxyProvenance,
    SecurityEventRateLimitResult,
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import {
    SystemIncidentEntity,
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { revokeAllUserSessions } from '../auth/session.service.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type {
    SecurityCenterEventsQuery,
    SecurityCenterSummaryQuery,
} from './admin.schemas.js'
import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'
import { sanitizeLogMetadata } from '../../shared/observability/sensitive-data.js'
import { buildSecurityCenterAnalytics } from './security-center-analytics.js'
import { boundAuditCsvCell } from './audit-export-policy.js'
import {
    normalizeSecurityCenterStatusMutation,
    normalizeSecurityCenterUuid,
} from './security-center-input-policy.js'

const SUMMARY_SAMPLE_LIMIT = 2_000
const RECENT_EVENT_LIMIT = 12

export function normalizeSecurityCenterOperatorNote(operatorNote?: string) {
    if (!operatorNote) return null

    return normalizeTextWhitespace(operatorNote).trim().slice(0, 1_000) || null
}

export type SecurityCenterEventResponse = {
    id: string
    userId: string | null
    type: SecurityEventType
    severity: SecurityEventSeverity
    status: 'open' | SecurityEventActionStatus
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
    actorRole: UserRole | null
    authOutcome: SecurityEventAuthOutcome
    rateLimitResult: SecurityEventRateLimitResult
    requestSizeBytes: number | null
    reasonCode: string | null
    proxyProvenance: SecurityEventProxyProvenance
    metadata: Record<string, unknown>
    createdAt: string
    actionTimeline: SecurityCenterActionTimelineItem[]
    relatedAuditLogs: SecurityCenterRelatedAuditLog[]
    relatedSystemIncidents: SecurityCenterRelatedSystemIncident[]
    lastAction: {
        status: SecurityEventActionStatus
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    } | null
}

export type SecurityCenterSummaryResponse = {
    windowMinutes: number
    sampled: boolean
    totalEvents: number
    openEvents: number
    highSeverityEvents: number
    criticalSeverityEvents: number
    blockedSignals: number
    byType: Array<{ type: SecurityEventType; count: number }>
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
    recentEvents: SecurityCenterEventResponse[]
}

export type SecurityCenterSessionRevocationResponse = {
    userId: string
    revokedAt: string
}

export type SecurityCenterActionTimelineItem = {
    id: string
    status: SecurityEventActionStatus
    operatorNote: string | null
    actorId: string
    assigneeId: string | null
    createdAt: string
}

export type SecurityCenterRelatedAuditLog = {
    id: string
    action: string
    targetType: string | null
    correlationId: string | null
    createdAt: string
}

export type SecurityCenterRelatedSystemIncident = {
    id: string
    type: SystemIncidentType
    severity: SystemIncidentSeverity
    status: SystemIncidentStatus
    title: string
    requestId: string | null
    occurrenceCount: number
    firstOccurredAt: string
    lastOccurredAt: string
}

type SecurityCenterEventContext = {
    actionTimeline: SecurityCenterActionTimelineItem[]
    relatedAuditLogs: SecurityCenterRelatedAuditLog[]
    relatedSystemIncidents: SecurityCenterRelatedSystemIncident[]
}

type SecurityEventActionLike = Pick<
    SecurityEventActionEntity,
    'status' | 'operatorNote' | 'actorId' | 'assigneeId'
> & { createdAt: Date | string }

function assertSecurityCenterReader(user: UserEntity) {
    if (isSuperAdmin(user)) return

    throw new AppError({
        statusCode: 403,
        code: ERROR_CODES.Forbidden,
        message: 'Only super admin can access the security center.',
    })
}

function requireSecurityCenterUuid(value: unknown) {
    const normalized = normalizeSecurityCenterUuid(value)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Security center identifier must be a valid UUID.' })
    }
    return normalized
}

function requireSecurityCenterStatusMutation(status: unknown, operatorNote: unknown, assigneeId: unknown) {
    const normalized = normalizeSecurityCenterStatusMutation({ status, operatorNote, assigneeId })
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Security event status mutation is invalid.' })
    }
    return normalized
}

function getLatestActions(actions: SecurityEventActionEntity[]) {
    const latest = new Map<string, SecurityEventActionEntity>()
    for (const action of actions) {
        if (!latest.has(action.securityEventId)) latest.set(action.securityEventId, action)
    }
    return latest
}

async function getActionsForEvents(eventIds: string[]) {
    if (eventIds.length === 0) return new Map<string, SecurityEventActionEntity>()

    const actions = await AppDataSource.getRepository(SecurityEventActionEntity)
        .createQueryBuilder('action')
        .where('action.securityEventId IN (:...eventIds)', { eventIds })
        .orderBy('action.createdAt', 'DESC')
        .addOrderBy('action.id', 'DESC')
        .getMany()

    return getLatestActions(actions)
}

async function getSecurityEventDetailContext(event: SecurityEventEntity): Promise<SecurityCenterEventContext> {
    const actionQuery = AppDataSource.getRepository(SecurityEventActionEntity)
        .createQueryBuilder('action')
        .where('action.securityEventId = :eventId', { eventId: event.id })
        .orderBy('action.createdAt', 'DESC')
        .addOrderBy('action.id', 'DESC')
        .take(20)

    const requestIds = [...new Set([event.requestId, event.correlationId].filter((value): value is string => Boolean(value)))]
    const auditQuery = AppDataSource.getRepository(AuditLogEntity)
        .createQueryBuilder('audit')
        .where(new Brackets((builder) => {
            builder.where('audit.targetId = :eventId', { eventId: event.id })
            if (requestIds.length > 0) {
                builder.orWhere('audit.correlationId IN (:...requestIds)', { requestIds })
                builder.orWhere(`audit.metadata ->> 'requestId' IN (:...requestIds)`, { requestIds })
            }
        }))
        .orderBy('audit.createdAt', 'DESC')
        .addOrderBy('audit.id', 'DESC')
        .take(50)

    const incidentQuery = requestIds.length === 0
        ? undefined
        : AppDataSource.getRepository(SystemIncidentEntity)
            .createQueryBuilder('incident')
            .where('incident.requestId IN (:...requestIds)', { requestIds })
            .orderBy('incident.lastOccurredAt', 'DESC')
            .addOrderBy('incident.id', 'DESC')
            .take(20)
    const [actionTimeline, auditLogs, systemIncidents] = await Promise.all([
        actionQuery.getMany(),
        auditQuery.getMany(),
        incidentQuery?.getMany() ?? Promise.resolve([]),
    ])

    return {
        actionTimeline: actionTimeline.map((action) => ({
            id: action.id,
            status: action.status,
            operatorNote: action.operatorNote,
            actorId: action.actorId,
            assigneeId: action.assigneeId,
            createdAt: action.createdAt.toISOString(),
        })),
        relatedAuditLogs: auditLogs.map((log) => ({
            id: log.id,
            action: log.action,
            targetType: log.targetType,
            correlationId: log.correlationId,
            createdAt: log.createdAt.toISOString(),
        })),
        relatedSystemIncidents: systemIncidents.map((incident) => ({
            id: incident.id,
            type: incident.type,
            severity: incident.severity,
            status: incident.status,
            title: incident.title,
            requestId: incident.requestId,
            occurrenceCount: incident.occurrenceCount,
            firstOccurredAt: incident.firstOccurredAt.toISOString(),
            lastOccurredAt: incident.lastOccurredAt.toISOString(),
        })),
    }
}

export function toSecurityCenterEventResponse(
    event: SecurityEventEntity,
    action: SecurityEventActionLike | undefined,
    context?: SecurityCenterEventContext,
): SecurityCenterEventResponse {
    return {
        id: event.id,
        userId: event.userId,
        type: event.type,
        severity: event.severity,
        status: action?.status ?? 'open',
        assigneeId: action?.assigneeId ?? null,
        failedLoginAttempts: event.failedLoginAttempts,
        lockedUntil: event.lockedUntil?.toISOString() ?? null,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        correlationId: event.correlationId,
        requestId: event.requestId,
        method: event.method,
        route: event.route,
        statusCode: event.statusCode,
        actorRole: event.actorRole,
        authOutcome: event.authOutcome,
        rateLimitResult: event.rateLimitResult,
        requestSizeBytes: event.requestSizeBytes,
        reasonCode: event.reasonCode,
        proxyProvenance: event.proxyProvenance,
        metadata: sanitizeLogMetadata(event.metadata),
        createdAt: event.createdAt.toISOString(),
        lastAction: action
            ? {
                status: action.status,
                operatorNote: action.operatorNote,
                actorId: action.actorId,
                assigneeId: action.assigneeId,
                createdAt: typeof action.createdAt === 'string'
                    ? action.createdAt
                    : action.createdAt.toISOString(),
            }
            : null,
        actionTimeline: context?.actionTimeline ?? [],
        relatedAuditLogs: context?.relatedAuditLogs ?? [],
        relatedSystemIncidents: context?.relatedSystemIncidents ?? [],
    }
}

function applyEventFilters(
    query: SelectQueryBuilder<SecurityEventEntity>,
    input: SecurityCenterEventsQuery,
) {
    if (input.type) query.andWhere('securityEvent.type = :type', { type: input.type })
    if (input.severity) query.andWhere('securityEvent.severity = :severity', { severity: input.severity })
    if (input.ip) query.andWhere('securityEvent.ipAddress = :ip', { ip: input.ip })
    if (input.route) query.andWhere('securityEvent.route ILIKE :route', { route: `%${input.route}%` })
    if (input.actorRole) query.andWhere('securityEvent.actorRole = :actorRole', { actorRole: input.actorRole })
    if (input.requestId) query.andWhere('securityEvent.requestId = :requestId', { requestId: input.requestId })
    if (input.authOutcome) query.andWhere('securityEvent.authOutcome = :authOutcome', { authOutcome: input.authOutcome })
    if (input.rateLimitResult) query.andWhere('securityEvent.rateLimitResult = :rateLimitResult', { rateLimitResult: input.rateLimitResult })
    if (input.from) query.andWhere('securityEvent.createdAt >= :from', { from: input.from })
    if (input.to) query.andWhere('securityEvent.createdAt <= :to', { to: input.to })
    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        query.andWhere(
            '(securityEvent.createdAt < :cursorCreatedAt OR (securityEvent.createdAt = :cursorCreatedAt AND securityEvent.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }
}

export async function getSecurityCenterEvents(
    user: UserEntity,
    input: SecurityCenterEventsQuery = {},
): Promise<SecurityCenterEventResponse[] | CursorPage<SecurityCenterEventResponse>> {
    assertSecurityCenterReader(user)
    const isPaginated = isCursorPaginationRequested(input)
    const limit = getCursorLimit(input.limit)
    const repository = AppDataSource.getRepository(SecurityEventEntity)
    const query = repository.createQueryBuilder('securityEvent')
    applyEventFilters(query, input)

    const events = await query
        .orderBy('securityEvent.createdAt', 'DESC')
        .addOrderBy('securityEvent.id', 'DESC')
        .take(isPaginated ? limit + 1 : 100)
        .getMany()
    const actions = await getActionsForEvents(events.map((event) => event.id))
    const response = events
        .map((event) => toSecurityCenterEventResponse(event, actions.get(event.id)))
        .filter((event) => !input.status || event.status === input.status)

    if (!isPaginated) return response

    return toCursorPage(response, limit, (event) => ({
        createdAt: event.createdAt,
        id: event.id,
    }))
}

function toSecurityCsvCell(value: unknown) {
    const text = boundAuditCsvCell(typeof value === 'string' ? value : JSON.stringify(value ?? ''))
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replace(/"/g, '""')}"`
}

export function securityCenterEventsToCsv(events: readonly SecurityCenterEventResponse[]) {
    const header = [
        'createdAt', 'type', 'severity', 'status', 'ipAddress', 'requestId',
        'method', 'route', 'statusCode', 'actorRole', 'authOutcome',
        'rateLimitResult', 'requestSizeBytes', 'reasonCode', 'proxyProvenance',
        'userAgent', 'metadata',
    ]
    const rows = events.map((event) => [
        event.createdAt,
        event.type,
        event.severity,
        event.status,
        event.ipAddress ?? '',
        event.requestId ?? '',
        event.method ?? '',
        event.route ?? '',
        event.statusCode ?? '',
        event.actorRole ?? '',
        event.authOutcome,
        event.rateLimitResult,
        event.requestSizeBytes ?? '',
        event.reasonCode ?? '',
        event.proxyProvenance,
        event.userAgent ?? '',
        '[redacted]',
    ])

    return [
        header.map(toSecurityCsvCell).join(','),
        ...rows.map((row) => row.map(toSecurityCsvCell).join(',')),
    ].join('\n') + '\n'
}

export function getSecurityCenterExportHeaders(date: string) {
    return {
        'cache-control': 'no-store',
        pragma: 'no-cache',
        'content-disposition': `attachment; filename="autocarehub-security-events-${date}.csv"`,
    } as const
}

export async function getSecurityCenterEvent(user: UserEntity, id: unknown) {
    assertSecurityCenterReader(user)
    const normalizedEventId = requireSecurityCenterUuid(id)
    const event = await AppDataSource.getRepository(SecurityEventEntity).findOne({ where: { id: normalizedEventId } })
    if (!event) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Security event not found.',
        })
    }
    const context = await getSecurityEventDetailContext(event)
    const latestAction = context.actionTimeline[0]
    return toSecurityCenterEventResponse(
        event,
        latestAction,
        context,
    )
}

export async function updateSecurityCenterEventStatus(
    user: UserEntity,
    id: unknown,
    status: unknown,
    operatorNote?: unknown,
    assigneeId?: unknown,
) {
    assertSecurityCenterReader(user)
    const normalizedEventId = requireSecurityCenterUuid(id)
    const normalizedMutation = requireSecurityCenterStatusMutation(status, operatorNote, assigneeId)
    const event = await AppDataSource.getRepository(SecurityEventEntity).findOne({ where: { id: normalizedEventId } })
    if (!event) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Security event not found.',
        })
    }

    const actionRepository = AppDataSource.getRepository(SecurityEventActionEntity)
    const previousAction = await actionRepository.findOne({
        where: { securityEventId: normalizedEventId },
        order: { createdAt: 'DESC', id: 'DESC' },
    })
    const resolvedAssigneeId = normalizedMutation.assigneeId === undefined
        ? previousAction?.assigneeId ?? null
        : normalizedMutation.assigneeId
    if (resolvedAssigneeId) {
        const assignee = await AppDataSource.getRepository(UserEntity).findOne({
            where: { id: resolvedAssigneeId },
            select: { id: true, role: true, status: true },
        })
        if (!assignee || assignee.role !== UserRole.SuperAdmin || assignee.status !== UserStatus.Active) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Security events can only be assigned to an active super-admin.',
            })
        }
    }

    const action = await actionRepository.save(actionRepository.create({
        securityEventId: normalizedEventId,
        actorId: user.id,
        status: normalizedMutation.status,
        assigneeId: resolvedAssigneeId,
        operatorNote: normalizedMutation.operatorNote,
    }))

    return toSecurityCenterEventResponse(event, action)
}

export async function revokeSecurityCenterUserSessions(
    user: UserEntity,
    targetUserId: unknown,
): Promise<SecurityCenterSessionRevocationResponse> {
    assertSecurityCenterReader(user)
    const normalizedTargetUserId = normalizeSecurityCenterUuid(targetUserId)
    if (user.id === targetUserId || (normalizedTargetUserId !== null && user.id.toLowerCase() === normalizedTargetUserId)) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'The current super-admin session cannot revoke itself.',
        })
    }

    const targetId = normalizedTargetUserId ?? requireSecurityCenterUuid(targetUserId)
    const target = await AppDataSource.getRepository(UserEntity).findOne({
        where: { id: targetId },
        select: { id: true },
    })
    if (!target) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'User not found.',
        })
    }

    await revokeAllUserSessions(target.id)
    return {
        userId: target.id,
        revokedAt: new Date().toISOString(),
    }
}

function countBy<T extends string>(values: T[]) {
    const counts = new Map<T, number>()
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
    return [...counts.entries()]
        .sort(([, left], [, right]) => right - left)
        .map(([value, count]) => ({ value, count }))
}

export async function getSecurityCenterSummary(
    user: UserEntity,
    input: SecurityCenterSummaryQuery = { windowMinutes: 1_440 },
): Promise<SecurityCenterSummaryResponse> {
    assertSecurityCenterReader(user)
    const windowMinutes = input.windowMinutes ?? 1_440
    const threshold = new Date(Date.now() - windowMinutes * 60_000)
    const events = await AppDataSource.getRepository(SecurityEventEntity)
        .createQueryBuilder('securityEvent')
        .where('securityEvent.createdAt >= :threshold', { threshold })
        .orderBy('securityEvent.createdAt', 'DESC')
        .addOrderBy('securityEvent.id', 'DESC')
        .take(SUMMARY_SAMPLE_LIMIT)
        .getMany()
    const actions = await getActionsForEvents(events.map((event) => event.id))
    const response = events.map((event) => toSecurityCenterEventResponse(event, actions.get(event.id)))
    const typeCounts = countBy(response.map((event) => event.type))
    const severityCounts = countBy(response.map((event) => event.severity))
    const ipCounts = countBy(response.map((event) => event.ipAddress).filter((ip): ip is string => Boolean(ip)))
    const routeCounts = countBy(response.map((event) => event.route).filter((route): route is string => Boolean(route)))
    const analytics = buildSecurityCenterAnalytics(response)

    return {
        windowMinutes,
        sampled: events.length === SUMMARY_SAMPLE_LIMIT,
        totalEvents: response.length,
        openEvents: response.filter((event) => event.status === 'open').length,
        highSeverityEvents: response.filter((event) => event.severity === SecurityEventSeverity.High).length,
        criticalSeverityEvents: response.filter((event) => event.severity === SecurityEventSeverity.Critical).length,
        blockedSignals: response.filter((event) => (
            event.type === SecurityEventType.RateLimitExceeded ||
            event.type === SecurityEventType.PrivilegeDenied
        )).length,
        byType: typeCounts.map(({ value, count }) => ({ type: value as SecurityEventType, count })),
        bySeverity: severityCounts.map(({ value, count }) => ({ severity: value as SecurityEventSeverity, count })),
        topIps: ipCounts.slice(0, 8).map(({ value, count }) => ({ ipAddress: value, count })),
        topRoutes: routeCounts.slice(0, 8).map(({ value, count }) => ({ route: value, count })),
        ...analytics,
        recentEvents: response.slice(0, RECENT_EVENT_LIMIT),
    }
}
