import type { FastifyInstance } from 'fastify'

import { requireAuth } from '../auth/require-auth.js'
import {
    validateBody,
    validateParams,
    validateQuery,
} from '../../shared/validation/validate.js'
import {
    adminCabinetParamsSchema,
    adminAutoCareProviderParamsSchema,
    adminAuditLogsQuerySchema,
    auditLogsExportQuerySchema,
    adminPaymentParamsSchema,
    adminPaymentsQuerySchema,
    adminUserParamsSchema,
    adminUsersQuerySchema,
    adminDeletionRequestsQuerySchema,
    adminDeletionRequestParamsSchema,
    createAdminSchema,
    outboxEventParamsSchema,
    systemIncidentParamsSchema,
    systemIncidentsQuerySchema,
    adminSecurityEventsQuerySchema,
    securityCenterEventsQuerySchema,
    securityCenterExportQuerySchema,
    securityCenterSummaryQuerySchema,
    securityCenterEventParamsSchema,
    updateSecurityCenterEventStatusSchema,
    securityMitigationsQuerySchema,
    createSecurityMitigationSchema,
    extendSecurityMitigationSchema,
    securityMitigationParamsSchema,
    updateCabinetStatusSchema,
    updateAdminAutoCareProviderStatusSchema,
    updateSystemIncidentStatusSchema,
    updateUserRoleSchema,
    updateUserStatusSchema,
    updateAdminDeletionRequestStatusSchema,
    refundPaymentSchema,
} from './admin.schemas.js'
import { getAccountDeletionAdminAuditMetadata } from './account-deletion-audit.js'
import {
    createAdmin,
    getAdminCabinets,
    getAdminUsers,
    getAdminPayments,
    getAdminPaymentAttention,
    getAdminPaymentRefunds,
    getAdminPaymentDisputes,
    updateAdminCabinetStatus,
    getAdminAutoCareProviders,
    getSuperAdminPlatformOverview,
    updateAdminAutoCareProviderStatus,
    updateAdminUserRole,
    updateAdminUserStatus,
} from './admin.service.js'
import {
    auditLogsToCsv,
    getAuditLogExportHeaders,
    getAuditLogs,
    getAuditLogsForExport,
    recordAuditLog,
} from './audit-log.service.js'
import {
    getSystemIncidents,
    updateSystemIncidentStatus,
} from './system-incidents.service.js'
import { getSecurityEvents, type SecurityEventResponse } from './security-events.service.js'
import {
    getSecurityCenterEvent,
    getSecurityCenterEvents,
    getSecurityCenterExportHeaders,
    getSecurityCenterSummary,
    securityCenterEventsToCsv,
    revokeSecurityCenterUserSessions,
    updateSecurityCenterEventStatus,
    type SecurityCenterEventResponse,
    type SecurityCenterSessionRevocationResponse,
    type SecurityCenterSummaryResponse,
} from './security-center.service.js'
import {
    createSecurityMitigation,
    extendSecurityMitigation,
    getSecurityMitigations,
    revokeSecurityMitigation,
    type SecurityMitigationResponse,
} from './security-mitigations.service.js'
import {
    deadLetterOutboxEvent,
    getOutboxHealth,
    retryOutboxEvent,
} from './outbox-monitor.service.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import type { SystemIncidentEntity } from '../../entities/system-incident/system-incident.entity.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import type { AdminCabinet, AdminPayment, AdminPaymentDispute, AdminPaymentRefund, AdminUser, CreateAdminResponse } from './admin.types.js'
import type { AdminAutoCareProvider, SuperAdminPlatformOverview } from './admin.service.js'
import { env } from '../../config/env.js'
import { getRequestLocale } from '../../shared/i18n/request-locale.js'
import { refundBookingPayment } from '../payments/payment-refund.service.js'
import {
    getAdminDeletionRequests,
    updateAdminDeletionRequestStatus,
    type AdminDeletionRequest,
} from './account-deletion-admin.service.js'

type CursorResponse<T> = CursorPage<T>
type AdminUsersListResponse = AdminUser[] | CursorResponse<AdminUser>
type AdminDeletionRequestsListResponse = AdminDeletionRequest[] | CursorResponse<AdminDeletionRequest>
type AdminUserResponse = AdminUser
type AdminCabinetsListResponse = AdminCabinet[]
type AdminCabinetResponse = AdminCabinet
type AdminPaymentResponse = Omit<AdminPayment, 'createdAt'> & { createdAt: string }
type AdminPaymentsListResponse = AdminPaymentResponse[] | CursorResponse<AdminPaymentResponse>
type AdminPaymentRefundResponse = Omit<AdminPaymentRefund, 'createdAt' | 'updatedAt'> & {
    createdAt: string
    updatedAt: string
}
type AdminPaymentDisputeResponse = Omit<AdminPaymentDispute, 'createdAt' | 'updatedAt' | 'lastEventCreatedAt'> & {
    lastEventCreatedAt: string
    createdAt: string
    updatedAt: string
}
type AdminPaymentAttentionResponse = Awaited<ReturnType<typeof getAdminPaymentAttention>>
type RefundPaymentResponse = { paymentId: string; status: string; refundedAmountMinor: number }

type AuditLogResponse = {
    id: string
    actor: {
        id: string
        name: string
    } | null
    action: string
    targetId: string | null
    targetType: string | null
    metadata: Record<string, unknown>
    ipAddress: string | null
    correlationId: string | null
    createdAt: string
}

type SystemIncidentResponse = {
    id: string
    type: string
    severity: string
    status: string
    title: string
    requestId: string | null
    metadata: Record<string, unknown>
    occurrenceCount: number
    firstOccurredAt: string
    lastOccurredAt: string
    acknowledgedAt: string | null
    resolvedAt: string | null
}

type AuditLogsListResponse = AuditLogResponse[] | CursorResponse<AuditLogResponse>
type SystemIncidentsListResponse = SystemIncidentResponse[] | CursorResponse<SystemIncidentResponse>
type SecurityEventsListResponse = SecurityEventResponse[] | CursorResponse<SecurityEventResponse>
type SecurityCenterEventsListResponse = SecurityCenterEventResponse[] | CursorResponse<SecurityCenterEventResponse>

type OutboxHealthResponse = {
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

function toSystemIncidentResponse(incident: SystemIncidentEntity): SystemIncidentResponse {
    return {
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        title: incident.title,
        requestId: incident.requestId,
        metadata: incident.metadata,
        occurrenceCount: incident.occurrenceCount,
        firstOccurredAt: incident.firstOccurredAt.toISOString(),
        lastOccurredAt: incident.lastOccurredAt.toISOString(),
        acknowledgedAt: incident.acknowledgedAt?.toISOString() ?? null,
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    }
}

function mapCursorResponse<T, M>(
    response: T[] | CursorPage<T>,
    mapper: (item: T) => M,
): M[] | CursorPage<M> {
    if (Array.isArray(response)) {
        return response.map(mapper)
    }

    return {
        items: response.items.map(mapper),
        nextCursor: response.nextCursor,
    }
}

export async function adminRoutes(
    app: FastifyInstance
) {
    app.get<{ Reply: AdminAutoCareProvider[] }>('/admin/autocare-providers', async (request) => {
        return getAdminAutoCareProviders(await requireAuth(request))
    })

    app.patch<{ Params: unknown; Body: unknown; Reply: AdminAutoCareProvider }>(
        '/admin/autocare-providers/:id/status',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(adminAutoCareProviderParamsSchema, request.params)
            const body = validateBody(updateAdminAutoCareProviderStatusSchema, request.body)
            const result = await updateAdminAutoCareProviderStatus(user, params.id, body.status)
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.AutoCareProviderStatusUpdated,
                targetId: params.id,
                targetType: 'autocare_provider',
                metadata: { oldStatus: result.oldStatus, newStatus: result.newStatus },
                request,
            })
            return result.provider
        },
    )

    app.get<{ Reply: SuperAdminPlatformOverview }>('/super-admin/platform-overview', async (request) => {
        return getSuperAdminPlatformOverview(await requireAuth(request))
    })

    app.get<{ Querystring: unknown; Reply: AdminUsersListResponse }>(
        '/admin/users',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(adminUsersQuerySchema, request.query)

            return getAdminUsers(user, query)
        }
    )

    app.get<{ Querystring: unknown; Reply: AdminDeletionRequestsListResponse }>(
        '/admin/account-deletion-requests',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(adminDeletionRequestsQuerySchema, request.query)

            return getAdminDeletionRequests(user, query)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: AdminDeletionRequest }>(
        '/admin/account-deletion-requests/:id/status',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(adminDeletionRequestParamsSchema, request.params)
            const body = validateBody(updateAdminDeletionRequestStatusSchema, request.body)

            const result = await updateAdminDeletionRequestStatus(user, params.id, body.status)

            await recordAuditLog({
                actorId: user.id,
                action: body.status === 'completed'
                    ? AuditAction.AccountDeletionCompleted
                    : AuditAction.AccountDeletionCancelled,
                targetId: params.id,
                targetType: 'account_deletion_request',
                metadata: getAccountDeletionAdminAuditMetadata({ requestId: request.id, status: body.status }),
                request,
            })

            return result
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: AdminUserResponse }>(
        '/admin/users/:id/status',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(adminUserParamsSchema, request.params)
            const body = validateBody(updateUserStatusSchema, request.body)

            const result = await updateAdminUserStatus(user, params.id, body.status)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.UserStatusUpdated,
                targetId: params.id,
                targetType: 'user',
                metadata: {
                    oldStatus: result.oldStatus,
                    newStatus: result.newStatus,
                },
                request,
            })

            return result.user
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: AdminUserResponse }>(
        '/admin/users/:id/role',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(adminUserParamsSchema, request.params)
            const body = validateBody(updateUserRoleSchema, request.body)

            const result = await updateAdminUserRole(user, params.id, body.role)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.UserRoleUpdated,
                targetId: params.id,
                targetType: 'user',
                metadata: {
                    oldRole: result.oldRole,
                    newRole: result.newRole,
                },
                request,
            })

            return result.user
        }
    )

    app.get<{ Reply: AdminCabinetsListResponse }>(
        '/admin/cabinets',
        async (request) => {
            const user = await requireAuth(request)

            return getAdminCabinets(user)
        }
    )

    app.get<{ Querystring: unknown; Reply: AdminPaymentsListResponse }>(
        '/admin/payments',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(adminPaymentsQuerySchema, request.query)
            const payments = await getAdminPayments(user, query)

            return mapCursorResponse(payments, (payment) => ({
                ...payment,
                createdAt: payment.createdAt.toISOString(),
            }))
        }
    )

    app.get<{ Reply: AdminPaymentAttentionResponse }>(
        '/admin/payments/attention',
        async (request, reply) => {
            const user = await requireAuth(request)
            const attention = await getAdminPaymentAttention(user)

            return reply
                .header('cache-control', 'no-store')
                .send(attention)
        },
    )

    app.get<{ Params: unknown; Reply: AdminPaymentRefundResponse[] }>(
        '/admin/payments/:id/refunds',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(adminPaymentParamsSchema, request.params)
            const refunds = await getAdminPaymentRefunds(user, params.id)

            return reply
                .header('cache-control', 'no-store')
                .send(refunds.map((refund) => ({
                    ...refund,
                    createdAt: refund.createdAt.toISOString(),
                    updatedAt: refund.updatedAt.toISOString(),
                })))
        },
    )

    app.get<{ Params: unknown; Reply: AdminPaymentDisputeResponse[] }>(
        '/admin/payments/:id/disputes',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(adminPaymentParamsSchema, request.params)
            const disputes = await getAdminPaymentDisputes(user, params.id)

            return reply
                .header('cache-control', 'no-store')
                .send(disputes.map((dispute) => ({
                    ...dispute,
                    lastEventCreatedAt: dispute.lastEventCreatedAt.toISOString(),
                    createdAt: dispute.createdAt.toISOString(),
                    updatedAt: dispute.updatedAt.toISOString(),
                })))
        },
    )

    app.post<{
        Params: unknown
        Body: unknown
        Reply: RefundPaymentResponse
    }>(
        '/admin/payments/:id/refund',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(adminPaymentParamsSchema, request.params)
            const body = validateBody(refundPaymentSchema, request.body)
            const payment = await refundBookingPayment(user, params.id, body.reason, request, body.amountMinor)

            return {
                paymentId: payment.id,
                status: payment.status,
                refundedAmountMinor: payment.refundedAmountMinor,
            }
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: AdminCabinetResponse }>(
        '/admin/cabinets/:id/status',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(adminCabinetParamsSchema, request.params)
            const body = validateBody(updateCabinetStatusSchema, request.body)

            const result = await updateAdminCabinetStatus(user, params.id, body.status)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.CabinetStatusUpdated,
                targetId: params.id,
                targetType: 'cabinet',
                metadata: {
                    oldStatus: result.oldStatus,
                    newStatus: result.newStatus,
                },
                request,
            })

            return result.cabinet
        }
    )

    app.post<{ Body: unknown; Reply: CreateAdminResponse }>(
        '/admin/admins',
        async (request) => {
            const user = await requireAuth(request)
            const body = validateBody(createAdminSchema, request.body)

            const result = await createAdmin(
                user,
                body,
                env.frontendOrigin,
                getRequestLocale(request)
            )

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.AdminCreated,
                targetId: result.user.id,
                targetType: 'user',
                metadata: {
                    name: result.user.name,
                    email: result.user.email,
                },
                request,
            })

            return result
        }
    )

    app.get<{ Querystring: unknown; Reply: AuditLogsListResponse }>(
        '/admin/audit-logs',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(adminAuditLogsQuerySchema, request.query)
            const logs = await getAuditLogs(user, query)

            return mapCursorResponse(logs, (log) => ({
                id: log.id,
                actor: log.actor ? {
                    id: log.actor.id,
                    name: log.actor.name,
                } : null,
                action: log.action,
                targetId: log.targetId,
                targetType: log.targetType,
                metadata: log.metadata,
                ipAddress: log.ipAddress,
                correlationId: log.correlationId,
                createdAt: log.createdAt.toISOString(),
            }))
        }
    )

    app.get('/admin/audit-logs/export', async (request, reply) => {
        const user = await requireAuth(request)
        const query = validateQuery(auditLogsExportQuerySchema, request.query)
        const logs = await getAuditLogsForExport(user, query)
        const date = new Date().toISOString().slice(0, 10)

        return reply
            .headers(getAuditLogExportHeaders(date))
            .type('text/csv; charset=utf-8')
            .send(auditLogsToCsv(logs))
    })

    app.get<{ Querystring: unknown; Reply: SystemIncidentsListResponse }>(
        '/admin/system-incidents',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(systemIncidentsQuerySchema, request.query)
            const incidents = await getSystemIncidents(user, query)

            return mapCursorResponse(incidents, toSystemIncidentResponse)
        }
    )

    app.get<{ Querystring: unknown; Reply: SecurityEventsListResponse }>(
        '/admin/security-events',
        async (request, reply) => {
            const user = await requireAuth(request)
            const query = validateQuery(adminSecurityEventsQuerySchema, request.query)
            const events = await getSecurityEvents(user, query)

            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityEventsViewed,
                targetType: 'security_events',
                metadata: {
                    type: query.type ?? null,
                    userId: query.userId ?? null,
                    paginated: query.cursor !== undefined || query.limit !== undefined,
                },
                request,
            })

            return events
        }
    )

    app.get<{ Querystring: unknown; Reply: SecurityCenterSummaryResponse }>(
        '/admin/security-center/summary',
        async (request, reply) => {
            const user = await requireAuth(request)
            const query = validateQuery(securityCenterSummaryQuerySchema, request.query)
            const summary = await getSecurityCenterSummary(user, query)

            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityCenterViewed,
                targetType: 'security_center',
                metadata: { view: 'summary', windowMinutes: query.windowMinutes },
                request,
            })

            return summary
        }
    )

    app.get<{ Querystring: unknown; Reply: SecurityCenterEventsListResponse }>(
        '/admin/security-center/events',
        async (request, reply) => {
            const user = await requireAuth(request)
            const query = validateQuery(securityCenterEventsQuerySchema, request.query)
            const events = await getSecurityCenterEvents(user, query)

            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityCenterViewed,
                targetType: 'security_center',
                metadata: { view: 'events', filters: query },
                request,
            })

            return events
        }
    )

    app.get('/admin/security-center/events/export', async (request, reply) => {
        const user = await requireAuth(request)
        const query = validateQuery(securityCenterExportQuerySchema, request.query)
        const result = await getSecurityCenterEvents(user, { ...query, limit: Math.min(query.limit, 100) })
        const events = Array.isArray(result) ? result : result.items
        const date = new Date().toISOString().slice(0, 10)

        reply
            .headers(getSecurityCenterExportHeaders(date))
            .type('text/csv; charset=utf-8')
        await recordAuditLog({
            actorId: user.id,
            action: AuditAction.SecurityCenterReportExported,
            targetType: 'security_center',
            metadata: { filters: query, rowCount: events.length, metadataRedacted: true },
            request,
        })

        return reply.send(securityCenterEventsToCsv(events))
    })

    app.get<{ Params: unknown; Reply: SecurityCenterEventResponse }>(
        '/admin/security-center/events/:id',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(securityCenterEventParamsSchema, request.params)
            const event = await getSecurityCenterEvent(user, params.id)

            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityCenterViewed,
                targetId: params.id,
                targetType: 'security_event',
                metadata: { view: 'detail' },
                request,
            })

            return event
        }
    )

    app.patch<{
        Params: unknown
        Body: unknown
        Reply: SecurityCenterEventResponse
    }>(
        '/admin/security-center/events/:id/status',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(securityCenterEventParamsSchema, request.params)
            const body = validateBody(updateSecurityCenterEventStatusSchema, request.body)
            const event = await updateSecurityCenterEventStatus(
                user,
                params.id,
                body.status,
                body.operatorNote,
                body.assigneeId,
            )

            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityCenterEventStatusUpdated,
                targetId: params.id,
                targetType: 'security_event',
                metadata: {
                    status: body.status,
                    hasOperatorNote: Boolean(body.operatorNote),
                    hasAssignee: Boolean(body.assigneeId),
                },
                request,
            })

            return event
        }
    )

    app.post<{ Params: unknown; Reply: SecurityCenterSessionRevocationResponse }>(
        '/admin/security-center/users/:id/revoke-sessions',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(adminUserParamsSchema, request.params)
            const result = await revokeSecurityCenterUserSessions(user, params.id)

            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityUserSessionsRevoked,
                targetId: result.userId,
                targetType: 'user_sessions',
                metadata: { revokedAt: result.revokedAt },
                request,
            })

            return result
        },
    )

    app.get<{ Querystring: unknown; Reply: SecurityMitigationResponse[] | CursorResponse<SecurityMitigationResponse> }>(
        '/admin/security-center/mitigations',
        async (request, reply) => {
            const user = await requireAuth(request)
            const query = validateQuery(securityMitigationsQuerySchema, request.query)
            const mitigations = await getSecurityMitigations(user, query)
            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityMitigationsViewed,
                targetType: 'security_mitigations',
                metadata: { status: query.status, kind: query.kind },
                request,
            })
            return mitigations
        },
    )

    app.post<{ Body: unknown; Reply: SecurityMitigationResponse }>(
        '/admin/security-center/mitigations',
        async (request, reply) => {
            const user = await requireAuth(request)
            const body = validateBody(createSecurityMitigationSchema, request.body)
            const mitigation = await createSecurityMitigation(user, body)
            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityMitigationCreated,
                targetId: mitigation.id,
                targetType: 'security_mitigation',
                metadata: {
                    kind: mitigation.kind,
                    displayValue: mitigation.displayValue,
                    expiresAt: mitigation.expiresAt,
                },
                request,
            })
            return mitigation
        },
    )

    app.delete<{ Params: unknown; Reply: SecurityMitigationResponse }>(
        '/admin/security-center/mitigations/:id',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(securityMitigationParamsSchema, request.params)
            const mitigation = await revokeSecurityMitigation(user, params.id)
            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityMitigationRevoked,
                targetId: mitigation.id,
                targetType: 'security_mitigation',
                metadata: { displayValue: mitigation.displayValue, revokedAt: mitigation.revokedAt },
                request,
            })
            return mitigation
        },
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: SecurityMitigationResponse }>(
        '/admin/security-center/mitigations/:id',
        async (request, reply) => {
            const user = await requireAuth(request)
            const params = validateParams(securityMitigationParamsSchema, request.params)
            const body = validateBody(extendSecurityMitigationSchema, request.body)
            const mitigation = await extendSecurityMitigation(user, params.id, body.extensionMinutes)
            reply.header('cache-control', 'no-store')
            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.SecurityMitigationExtended,
                targetId: mitigation.id,
                targetType: 'security_mitigation',
                metadata: {
                    displayValue: mitigation.displayValue,
                    extensionMinutes: body.extensionMinutes,
                    expiresAt: mitigation.expiresAt,
                },
                request,
            })
            return mitigation
        },
    )

    app.get<{ Reply: OutboxHealthResponse }>(
        '/admin/outbox/health',
        async (request) => {
            const user = await requireAuth(request)
            const health = await getOutboxHealth(user)

            return {
                counts: health.counts,
                abandonedCount: health.abandonedCount,
                deadLetterCount: health.deadLetterCount,
                failedEvents: health.failedEvents.map((event) => ({
                    id: event.id,
                    type: event.type,
                    idempotencyKey: event.idempotencyKey,
                    status: event.status,
                    attempts: event.attempts,
                    availableAt: event.availableAt.toISOString(),
                    lockedAt: event.lockedAt?.toISOString() ?? null,
                    processedAt: event.processedAt?.toISOString() ?? null,
                    lastError: event.lastError,
                    createdAt: event.createdAt.toISOString(),
                })),
            }
        }
    )

    app.post<{ Params: unknown; Reply: { success: true; eventId: string; status: string } }>(
        '/admin/outbox/:id/dead-letter',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(outboxEventParamsSchema, request.params)
            const event = await deadLetterOutboxEvent(user, params.id)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.OutboxDeadLettered,
                targetId: event.id,
                targetType: 'outbox_event',
                metadata: {
                    type: event.type,
                    attempts: event.attempts,
                },
                request,
            })

            return {
                success: true,
                eventId: event.id,
                status: event.status,
            }
        }
    )

    app.post<{ Params: unknown; Reply: { success: true; eventId: string; status: string } }>(
        '/admin/outbox/:id/retry',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(outboxEventParamsSchema, request.params)
            const event = await retryOutboxEvent(user, params.id)

            await recordAuditLog({
                actorId: user.id,
                action: AuditAction.OutboxRetried,
                targetId: event.id,
                targetType: 'outbox_event',
                metadata: {
                    type: event.type,
                    resetAttempts: event.attempts,
                },
                request,
            })

            return {
                success: true,
                eventId: event.id,
                status: event.status,
            }
        }
    )

    app.patch<{
        Params: unknown
        Body: unknown
        Reply: SystemIncidentResponse
    }>(
        '/admin/system-incidents/:id/status',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(systemIncidentParamsSchema, request.params)
            const body = validateBody(updateSystemIncidentStatusSchema, request.body)
            const incident = await updateSystemIncidentStatus(user, params.id, body.status)

            return toSystemIncidentResponse(incident)
        }
    )
}
