import { z } from 'zod'

import { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { AutomotiveLocationZoneType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'
import { AutomotiveProviderChangeRequestKind, AutomotiveProviderChangeRequestStatus } from '../../entities/automotive/provider-change-request.entity.js'
import { AutomotiveCatalogGapRequestStatus } from '../../entities/automotive/catalog-gap-request.entity.js'
import { AutoCareChatReportStatus } from '../../entities/automotive/chat-moderation.entity.js'
import { AutoCareAppealStatus, AutoCareAppealSubject } from '../../entities/automotive/appeal.entity.js'
import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'
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

export const adminAutoCareProviderParamsSchema = z.object({
    id: z.string().uuid('Automotive provider id must be a valid UUID.'),
})

export const adminAutoCareMarketParamsSchema = z.object({
    id: z.string().uuid('Automotive market id must be a valid UUID.'),
})

export const adminAutoCareServiceDefinitionParamsSchema = z.object({
    id: z.string().uuid('Automotive service definition id must be a valid UUID.'),
})

const marketCapabilitiesSchema = z.record(
    z.string().trim().regex(/^[a-z][a-z0-9_.-]{1,63}$/),
    z.boolean(),
).refine((value) => Object.keys(value).length <= 32, 'A market can have at most 32 capabilities.')

const marketLegalLinksSchema = z.record(
    z.string().trim().regex(/^[a-z][a-z0-9_.-]{1,63}$/),
    z.string().trim().url().max(2_000),
).refine((value) => Object.keys(value).length <= 24, 'A market can have at most 24 legal links.')

const unsupportedCommercialCapabilityKeys = ['paid_access', 'commercial_codes', 'settlement'] as const

function validateMarketProfile(value: {
    defaultLocale: string
    supportedLocales: string[]
    capabilities?: Record<string, boolean>
}, context: z.RefinementCtx) {
    const normalizedLocales = value.supportedLocales.map((locale) => locale.toLowerCase())
    if (new Set(normalizedLocales).size !== normalizedLocales.length) {
        context.addIssue({ code: 'custom', path: ['supportedLocales'], message: 'supportedLocales must not contain duplicates.' })
    }
    if (!normalizedLocales.includes(value.defaultLocale.toLowerCase())) {
        context.addIssue({ code: 'custom', path: ['defaultLocale'], message: 'defaultLocale must be included in supportedLocales.' })
    }
    for (const key of unsupportedCommercialCapabilityKeys) {
        if (value.capabilities?.[key]) {
            context.addIssue({ code: 'custom', path: ['capabilities', key], message: 'Commercial capabilities are outside the AutoCare Hub product scope.' })
        }
    }
}

export const updateSuperAdminAutoCareMarketSchema = z.object({
    defaultLocale: z.string().trim().min(2).max(16),
    supportedLocales: z.array(z.string().trim().min(2).max(16)).min(1).max(20),
    timezone: z.string().trim().min(3).max(80),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/),
    capabilities: marketCapabilitiesSchema.optional(),
    legalLinks: marketLegalLinksSchema.optional(),
    launchReady: z.boolean(),
}).superRefine(validateMarketProfile)

const localizedNamesSchema = z.record(
    z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),
    z.string().trim().min(1).max(160),
).refine((value) => Object.keys(value).length > 0, 'At least one localized name is required.')

const marketProfileSchema = z.object({
    defaultLocale: z.string().trim().min(2).max(16),
    supportedLocales: z.array(z.string().trim().min(2).max(16)).min(1).max(20),
    timezone: z.string().trim().min(3).max(80),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/),
    capabilities: marketCapabilitiesSchema.default({}),
    legalLinks: marketLegalLinksSchema.default({}),
}).superRefine(validateMarketProfile)

export const superAdminCountryParamsSchema = z.object({ id: z.string().uuid() })
export const superAdminMarketZoneParamsSchema = z.object({ id: z.string().uuid() })

export const createSuperAdminMarketCountrySchema = marketProfileSchema.extend({
    code: z.string().trim().regex(/^[A-Z]{2,3}$/),
    names: localizedNamesSchema,
    active: z.boolean().default(true),
})

export const updateSuperAdminMarketCountrySchema = marketProfileSchema.extend({
    names: localizedNamesSchema,
    active: z.boolean(),
})

export const createSuperAdminAutoCareMarketSchema = marketProfileSchema.extend({
    cityCode: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,119}$/),
    cityName: z.string().trim().min(1).max(160),
    regionCode: z.string().trim().min(1).max(80).nullable().optional(),
    regionName: z.string().trim().min(1).max(160).nullable().optional(),
    centerLatitude: z.number().finite().min(-90).max(90).nullable().optional(),
    centerLongitude: z.number().finite().min(-180).max(180).nullable().optional(),
    launchReady: z.boolean().default(false),
}).superRefine((value, context) => {
    if ((value.centerLatitude === null || value.centerLatitude === undefined) !== (value.centerLongitude === null || value.centerLongitude === undefined)) {
        context.addIssue({ code: 'custom', path: ['centerLatitude'], message: 'Center latitude and longitude must be provided together.' })
    }
})

export const updateSuperAdminAutoCareMarketHierarchySchema = createSuperAdminAutoCareMarketSchema

export const createSuperAdminAutoCareMarketZoneSchema = z.object({
    parentId: z.string().uuid().nullable().optional(),
    slug: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,119}$/),
    zoneType: z.nativeEnum(AutomotiveLocationZoneType),
    names: localizedNamesSchema,
    centerLatitude: z.number().finite().min(-90).max(90).nullable().optional(),
    centerLongitude: z.number().finite().min(-180).max(180).nullable().optional(),
    radiusKm: z.number().finite().positive().max(500).nullable().optional(),
    imageUrl: z.string().trim().url().max(2_000).nullable().optional(),
    displayOrder: z.number().int().min(0).max(10_000).default(0),
    active: z.boolean().default(true),
}).superRefine((value, context) => {
    if ((value.centerLatitude === null || value.centerLatitude === undefined) !== (value.centerLongitude === null || value.centerLongitude === undefined)) {
        context.addIssue({ code: 'custom', path: ['centerLatitude'], message: 'Center latitude and longitude must be provided together.' })
    }
})

export const updateSuperAdminAutoCareMarketZoneSchema = createSuperAdminAutoCareMarketZoneSchema

export const updateSuperAdminTrustPolicySchema = z.object({
    policyVersion: z.string().trim().regex(/^autocare-trust-v[0-9]+$/),
    trustedMinimumRating: z.number().finite().min(0).max(5),
    trustedMinimumReviews: z.number().int().min(0).max(10_000),
    trustedMinimumCompletedVisits: z.number().int().min(0).max(100_000),
    trustedMaxNoShowRate: z.number().finite().min(0).max(1),
    trustedMaxComplaintRate: z.number().finite().min(0).max(1),
    trustedMaxResponseTimeMinutes: z.number().int().min(1).max(10_080),
    reassessmentIntervalHours: z.number().int().min(1).max(720),
    rollout: z.object({
        enabled: z.boolean(),
        marketIds: z.array(z.string().trim().min(1).max(120)).max(500),
        percentage: z.number().int().min(0).max(100),
    }),
})

export const updateAdminAutoCareProviderStatusSchema = z.object({
    status: z.nativeEnum(AutomotiveProviderStatus),
})

export const adminProviderChangeRequestsQuerySchema = z.object({
    status: z.nativeEnum(AutomotiveProviderChangeRequestStatus).optional(),
    kind: z.nativeEnum(AutomotiveProviderChangeRequestKind).optional(),
})

export const adminProviderChangeRequestParamsSchema = z.object({
    id: z.string().uuid('Provider change request id must be a valid UUID.'),
})

export const decideAdminProviderChangeRequestSchema = z.object({
    status: z.enum([AutomotiveProviderChangeRequestStatus.Approved, AutomotiveProviderChangeRequestStatus.Rejected]),
    reason: z.string().trim().min(1).max(2_000).nullable().optional(),
})

export const adminCatalogGapRequestsQuerySchema = z.object({
    status: z.nativeEnum(AutomotiveCatalogGapRequestStatus).optional(),
})

export const adminCatalogGapRequestParamsSchema = z.object({
    id: z.string().uuid('Catalog gap request id must be a valid UUID.'),
})

export const decideAdminCatalogGapRequestSchema = z.object({
    status: z.enum([AutomotiveCatalogGapRequestStatus.Approved, AutomotiveCatalogGapRequestStatus.Rejected]),
    reason: z.string().trim().min(1).max(2_000).nullable().optional(),
})

export const adminChatReportsQuerySchema = z.object({
    status: z.nativeEnum(AutoCareChatReportStatus).optional(),
})

export const adminChatReportParamsSchema = z.object({
    id: z.string().uuid('Chat report id must be a valid UUID.'),
})

export const decideAdminChatReportSchema = z.object({
    status: z.enum([AutoCareChatReportStatus.Resolved, AutoCareChatReportStatus.Dismissed]),
    reason: z.string().trim().min(1).max(2_000).nullable().optional(),
    blockUser: z.boolean().default(false),
})

export const adminAutoCareAppealsQuerySchema = z.object({
    ...cursorPaginationFields,
    status: z.nativeEnum(AutoCareAppealStatus).optional(),
    subject: z.nativeEnum(AutoCareAppealSubject).optional(),
})

export const adminAutoCareAppealParamsSchema = z.object({ id: z.string().uuid() })

export const decideAdminAutoCareAppealSchema = z.object({
    status: z.enum([AutoCareAppealStatus.Accepted, AutoCareAppealStatus.Rejected]),
    reason: z.string().trim().min(1).max(2_000),
})

export const adminAutoCareModerationEvidenceQuerySchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
})

export const adminAutoCareModerationEvidenceParamsSchema = z.object({
    id: z.string().uuid(),
})

export const decideAdminAutoCareModerationEvidenceSchema = z.object({
    status: z.enum(['approved', 'rejected']),
    reason: z.string().trim().min(1).max(2_000),
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

export const systemIncidentParamsSchema = z.object({
    id: z.string().uuid('System incident id must be a valid UUID.'),
})

export const outboxEventParamsSchema = z.object({
    id: z.string().uuid('Outbox event id must be a valid UUID.'),
})

export const updateSystemIncidentStatusSchema = z.object({
    status: z.nativeEnum(SystemIncidentStatus),
})
