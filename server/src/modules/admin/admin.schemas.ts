import { z } from 'zod'

import { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventRateLimitResult,
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { SecurityEventActionStatus } from '../../entities/security-event/security-event-action.entity.js'
import { SecurityMitigationKind } from '../../entities/security-mitigation/security-mitigation.entity.js'
import {
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'

const cursorPaginationFields = {
    cursor: z.string().trim().max(512).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
}

export const adminUsersQuerySchema = z.object({
    ...cursorPaginationFields,
    search: z.string().trim().max(120).optional(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
})

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>

export const adminPaymentsQuerySchema = z.object({
    ...cursorPaginationFields,
    search: z.string().trim().max(120).optional(),
    status: z.nativeEnum(BookingPaymentStatus).optional(),
})

export type AdminPaymentsQuery = z.infer<typeof adminPaymentsQuerySchema>

export const adminAuditLogsQuerySchema = z.object({
    ...cursorPaginationFields,
    search: z.string().trim().max(160).optional(),
    action: z.string().trim().max(100).optional(),
    targetType: z.string().trim().max(100).optional(),
    actorId: z.string().uuid().optional(),
})

export type AdminAuditLogsQuery = z.infer<typeof adminAuditLogsQuerySchema>

export const auditLogsExportQuerySchema = z.object({
    search: z.string().trim().max(160).optional(),
    action: z.string().trim().max(100).optional(),
    targetType: z.string().trim().max(100).optional(),
    actorId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(10_000).default(1_000),
})

export type AuditLogsExportQuery = z.infer<typeof auditLogsExportQuerySchema>

export const systemIncidentsQuerySchema = z.object({
    ...cursorPaginationFields,
    search: z.string().trim().max(160).optional(),
    type: z.nativeEnum(SystemIncidentType).optional(),
    severity: z.nativeEnum(SystemIncidentSeverity).optional(),
    status: z.nativeEnum(SystemIncidentStatus).optional(),
})

export type SystemIncidentsQuery = z.infer<typeof systemIncidentsQuerySchema>

export const adminSecurityEventsQuerySchema = z.object({
    ...cursorPaginationFields,
    type: z.nativeEnum(SecurityEventType).optional(),
    userId: z.string().uuid().optional(),
})

export type AdminSecurityEventsQuery = z.infer<typeof adminSecurityEventsQuerySchema>

const securityCenterEventFilterShape = {
    type: z.nativeEnum(SecurityEventType).optional(),
    severity: z.nativeEnum(SecurityEventSeverity).optional(),
    status: z.nativeEnum(SecurityEventActionStatus).optional(),
    ip: z.string().trim().max(64).optional(),
    route: z.string().trim().max(240).optional(),
    actorRole: z.nativeEnum(UserRole).optional(),
    requestId: z.string().trim().max(128).optional(),
    authOutcome: z.nativeEnum(SecurityEventAuthOutcome).optional(),
    rateLimitResult: z.nativeEnum(SecurityEventRateLimitResult).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
}

function validateSecurityCenterDateRange(
    input: { from?: Date; to?: Date },
    context: z.RefinementCtx,
) {
    if (input.from && input.to && input.from > input.to) {
        context.addIssue({
            code: 'custom',
            path: ['to'],
            message: 'The end of the time range must be after its start.',
        })
    }
}

export const securityCenterEventsQuerySchema = z.object({
    ...cursorPaginationFields,
    ...securityCenterEventFilterShape,
}).superRefine(validateSecurityCenterDateRange)

export type SecurityCenterEventsQuery = z.infer<typeof securityCenterEventsQuerySchema>

export const securityCenterExportQuerySchema = z.object({
    ...securityCenterEventFilterShape,
    limit: z.coerce.number().int().positive().max(100).default(100),
}).superRefine(validateSecurityCenterDateRange)

export type SecurityCenterExportQuery = z.infer<typeof securityCenterExportQuerySchema>

export const securityCenterSummaryQuerySchema = z.object({
    windowMinutes: z.coerce.number().int().min(5).max(10_080).default(1_440),
})

export type SecurityCenterSummaryQuery = z.infer<typeof securityCenterSummaryQuerySchema>

export const securityCenterEventParamsSchema = z.object({
    id: z.string().uuid('Security event id must be a valid UUID.'),
})

export const updateSecurityCenterEventStatusSchema = z.object({
    status: z.nativeEnum(SecurityEventActionStatus),
    operatorNote: z.string().trim().max(1_000).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
})

export const securityMitigationsQuerySchema = z.object({
    ...cursorPaginationFields,
    status: z.enum(['active', 'expired', 'revoked']).default('active'),
    ipAddress: z.string().trim().max(64).optional(),
    kind: z.nativeEnum(SecurityMitigationKind).default(SecurityMitigationKind.IpBlock),
})

export type SecurityMitigationsQuery = z.infer<typeof securityMitigationsQuerySchema>

export const createSecurityMitigationSchema = z.object({
    kind: z.nativeEnum(SecurityMitigationKind).default(SecurityMitigationKind.IpBlock),
    ipAddress: z.string().trim().min(3).max(64),
    reason: z.string().trim().min(1).max(500),
    ttlMinutes: z.coerce.number().int().min(1).max(1_440).default(60),
})

export const extendSecurityMitigationSchema = z.object({
    extensionMinutes: z.coerce.number().int().min(1).max(1_440),
})

export const securityMitigationParamsSchema = z.object({
    id: z.string().uuid('Security mitigation id must be a valid UUID.'),
})

export const adminDeletionRequestsQuerySchema = z.object({
    ...cursorPaginationFields,
    status: z.nativeEnum(AccountDeletionRequestStatus).optional(),
})

export type AdminDeletionRequestsQuery = z.infer<typeof adminDeletionRequestsQuerySchema>

export const adminUserParamsSchema = z.object({
    id: z.string().uuid('User id must be a valid UUID.'),
})

export const adminDeletionRequestParamsSchema = z.object({
    id: z.string().uuid('Deletion request id must be a valid UUID.'),
})

export const adminCabinetParamsSchema = z.object({
    id: z.string().uuid('Cabinet id must be a valid UUID.'),
})

export const adminPaymentParamsSchema = z.object({
    id: z.string().uuid('Payment id must be a valid UUID.'),
})

export const updateUserStatusSchema = z.object({
    status: z.enum(UserStatus),
})

export const updateAdminDeletionRequestStatusSchema = z.object({
    status: z.enum([
        AccountDeletionRequestStatus.Cancelled,
        AccountDeletionRequestStatus.Completed,
    ]),
})

export const updateUserRoleSchema = z.object({
    role: z.nativeEnum(UserRole),
})

export const updateCabinetStatusSchema = z.object({
    status: z.enum(CabinetStatus),
})

export const createAdminSchema = z.object({
    name: z.string().trim().min(2, 'Name must contain at least 2 characters.').max(120),
    email: z.string().trim().email('Enter a valid email.').max(320),
})

export const refundPaymentSchema = z.object({
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']),
    amountMinor: z.number().int().positive().safe().optional(),
})

export const systemIncidentParamsSchema = z.object({
    id: z.string().uuid('System incident id must be a valid UUID.'),
})

export const outboxEventParamsSchema = z.object({
    id: z.string().uuid('Outbox event id must be a valid UUID.'),
})

export const updateSystemIncidentStatusSchema = z.object({
    status: z.nativeEnum(SystemIncidentStatus),
})
