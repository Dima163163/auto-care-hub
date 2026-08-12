import type { FastifyInstance } from 'fastify'

import { MAX_CURSOR_LENGTH } from '../shared/security/request-limits.js'
import { MAX_CURSOR_PAGE_LIMIT } from '../shared/http/cursor-pagination.js'

const cursorParameters = [
    { $ref: '#/components/parameters/Cursor' },
    { $ref: '#/components/parameters/Limit' },
] as const

const adminPaymentParameters = [
    ...cursorParameters,
    { $ref: '#/components/parameters/AdminPaymentSearch' },
    { $ref: '#/components/parameters/AdminPaymentStatus' },
] as const

const adminAuditParameters = [
    ...cursorParameters,
    { $ref: '#/components/parameters/AdminSearch' },
] as const

const adminIncidentParameters = [
    ...cursorParameters,
    { $ref: '#/components/parameters/AdminSearch' },
    { $ref: '#/components/parameters/AdminIncidentStatus' },
] as const

const adminSecurityEventParameters = [
    ...cursorParameters,
    {
        name: 'type',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['login_failed', 'account_locked', 'refresh_token_reuse'] },
    },
    {
        name: 'userId',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'uuid' },
    },
] as const

const securityCenterFilterParameters = [
    {
        name: 'type',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['login_failed', 'account_locked', 'refresh_token_reuse', 'rate_limit_exceeded', 'invalid_token', 'csrf_violation', 'route_scan', 'malformed_request', 'oversized_request', 'privilege_denied', 'webhook_abuse', 'mutation_burst'] },
    },
    {
        name: 'severity',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['info', 'warning', 'high', 'critical'] },
    },
    {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['open', 'acknowledged', 'investigating', 'resolved', 'suppressed'] },
    },
    { name: 'ip', in: 'query', required: false, schema: { type: 'string', maxLength: 64 } },
    { name: 'route', in: 'query', required: false, schema: { type: 'string', maxLength: 240 } },
    { name: 'actorRole', in: 'query', required: false, schema: { type: 'string', enum: ['client', 'owner', 'admin', 'super_admin'] } },
    { name: 'requestId', in: 'query', required: false, schema: { type: 'string', maxLength: 128 } },
    { name: 'authOutcome', in: 'query', required: false, schema: { type: 'string', enum: ['unknown', 'anonymous', 'authenticated', 'failed'] } },
    { name: 'rateLimitResult', in: 'query', required: false, schema: { type: 'string', enum: ['not_checked', 'allowed', 'blocked'] } },
    { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
    { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date-time' } },
] as const

const securityCenterEventParameters = [
    ...cursorParameters,
    ...securityCenterFilterParameters,
] as const

const securityCenterExportParameters = [
    { $ref: '#/components/parameters/Limit' },
    ...securityCenterFilterParameters,
] as const

const securityMitigationParameters = [
    ...cursorParameters,
    {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['active', 'expired', 'revoked'], default: 'active' },
    },
    { name: 'ipAddress', in: 'query', required: false, schema: { type: 'string', maxLength: 64 } },
    { name: 'kind', in: 'query', required: false, schema: { type: 'string', enum: ['ip_block'], default: 'ip_block' } },
] as const

const adminDeletionParameters = [
    ...cursorParameters,
    { $ref: '#/components/parameters/AdminDeletionStatus' },
] as const

export function getOpenApiDocument() {
    return {
        openapi: '3.1.0',
        info: {
            title: 'AutoCare Hub API',
            version: '1.0.0',
            description: 'Machine-readable foundation for the AutoCare Hub REST contract.',
        },
        servers: [{ url: '/api', description: 'Configured API base path' }],
        security: [{ bearerAuth: [] }],
        paths: {
            '/health/live': {
                get: {
                    operationId: 'getHealthLive',
                    security: [],
                    responses: {
                        '200': {
                            description: 'Process is alive.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthLiveResponse' } } },
                        },
                    },
                },
            },
            '/health/ready': {
                get: {
                    operationId: 'getHealthReady',
                    security: [],
                    responses: {
                        '200': {
                            description: 'Dependencies are ready.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
                        },
                        '503': {
                            description: 'A dependency is degraded.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
                        },
                    },
                },
            },
            '/v1/markets': {
                get: { operationId: 'listAutoCareMarkets', security: [], responses: { '200': { description: 'AutoCare launch markets and supported locales.' } } },
            },
            '/v1/service-definitions': {
                get: { operationId: 'listAutoCareServiceDefinitions', security: [], responses: { '200': { description: 'Active standardized automotive services.' } } },
            },
            '/v1/discovery/providers': {
                get: {
                    operationId: 'discoverAutoCareProviders',
                    security: [],
                    parameters: [
                        { name: 'serviceId', in: 'query', required: false, schema: { type: 'string' } },
                        { name: 'marketId', in: 'query', required: false, schema: { type: 'string' } },
                        { name: 'radiusKm', in: 'query', required: false, schema: { type: 'number', minimum: 0 } },
                        { name: 'sort', in: 'query', required: false, schema: { type: 'string', enum: ['recommended', 'price_asc', 'rating_desc', 'distance_asc'] } },
                        { name: 'minPrice', in: 'query', required: false, schema: { type: 'number', minimum: 0 } },
                        { name: 'maxPrice', in: 'query', required: false, schema: { type: 'number', minimum: 0 } },
                        { name: 'minRating', in: 'query', required: false, schema: { type: 'number', minimum: 0, maximum: 5 } },
                        { name: 'priceType', in: 'query', required: false, schema: { type: 'string', enum: ['fixed', 'from', 'range', 'quote_required'] } },
                        { name: 'availableToday', in: 'query', required: false, schema: { type: 'boolean' } },
                        { name: 'verifiedOnly', in: 'query', required: false, schema: { type: 'boolean' } },
                        { name: 'warrantyOnly', in: 'query', required: false, schema: { type: 'boolean' } },
                        { name: 'hasBonus', in: 'query', required: false, schema: { type: 'boolean' } },
                        { name: 'inclusion', in: 'query', required: false, schema: { type: 'string' } },
                        ...cursorParameters,
                    ],
                    responses: { '200': { description: 'Stable, comparable AutoCare provider results.' } },
                },
            },
            '/v1/providers/{providerId}': {
                get: { operationId: 'getAutoCareProviderProfile', security: [], parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Public provider profile with offers and image fallbacks.' } } },
            },
            '/v1/providers/{providerId}/offers': {
                get: { operationId: 'listAutoCareProviderOffers', security: [], parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'serviceId', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'Active provider offers for comparison and request entry.' } } },
            },
            '/cabinets': {
                get: { operationId: 'listPublicCabinets', security: [], parameters: cursorParameters, responses: { '200': { description: 'Paginated public cabinet catalog.' } } },
            },
            '/bookings/my': {
                get: { operationId: 'listMyBookings', parameters: cursorParameters, responses: { '200': { description: 'Authenticated client bookings.' } } },
            },
            '/bookings/{id}/payment/status': {
                get: {
                    operationId: 'getMyBookingPaymentStatus',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                    responses: { '200': { description: 'Client-safe booking payment lifecycle status and receipt summary.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ClientBookingPaymentStatus' } } } } },
                },
            },
            '/owner/bookings': {
                get: {
                    operationId: 'listOwnerBookings',
                    parameters: cursorParameters,
                    responses: {
                        '200': {
                            description: 'Authenticated owner bookings with owner-safe payment ledger fields and no provider identifiers.',
                            content: {
                                'application/json': {
                                    schema: {
                                        oneOf: [
                                            { type: 'array', items: { $ref: '#/components/schemas/OwnerBooking' } },
                                            { $ref: '#/components/schemas/OwnerBookingCursorPage' },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/owner/readiness': {
                get: {
                    operationId: 'getOwnerReadiness',
                    responses: {
                        '200': {
                            description: 'Owner go-live readiness checks.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/OwnerReadiness' } } },
                        },
                    },
                },
            },
            '/owner/action-center/events': {
                post: {
                    operationId: 'recordOwnerActionCenterEvent',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/OwnerActionCenterEvent' } } },
                    },
                    responses: {
                        '200': {
                            description: 'Accepted privacy-safe owner action telemetry event.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/OwnerActionCenterEventResponse' } } },
                        },
                    },
                },
            },
            '/client/experiment-events': {
                post: {
                    operationId: 'recordClientExperimentEvent',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ClientExperimentEvent' } } },
                    },
                    responses: {
                        '200': {
                            description: 'Accepted privacy-safe client experiment telemetry event.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ClientExperimentEventResponse' } } },
                        },
                    },
                },
            },
            '/notifications': {
                get: { operationId: 'listNotifications', parameters: cursorParameters, responses: { '200': { description: 'Authenticated notifications.' } } },
            },
            '/admin/users': {
                get: { operationId: 'listAdminUsers', parameters: cursorParameters, responses: { '200': { description: 'Legacy array or cursor page of users.' } } },
            },
            '/admin/account-deletion-requests': {
                get: {
                    operationId: 'listAdminAccountDeletionRequests',
                    parameters: adminDeletionParameters,
                    responses: { '200': { description: 'Super-admin account deletion request list.' } },
                },
            },
            '/admin/account-deletion-requests/{id}/status': {
                patch: {
                    operationId: 'updateAdminAccountDeletionRequestStatus',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminDeletionRequestStatusUpdate' } } },
                    },
                    responses: {
                        '200': {
                            description: 'Updated account deletion request.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminDeletionRequest' } } },
                        },
                    },
                },
            },
            '/admin/payments': {
                get: {
                    operationId: 'listAdminPayments',
                    parameters: adminPaymentParameters,
                    responses: {
                        '200': {
                            description: 'Legacy array or cursor page of payments.',
                            content: {
                                'application/json': {
                                    schema: {
                                        oneOf: [
                                            { type: 'array', items: { $ref: '#/components/schemas/AdminPayment' } },
                                            { $ref: '#/components/schemas/AdminPaymentCursorPage' },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/admin/payments/attention': {
                get: {
                    operationId: 'getAdminPaymentAttention',
                    responses: {
                        '200': {
                            description: 'Bounded super-admin payment and provider outcome counters without provider identifiers.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminPaymentAttention' } } },
                        },
                    },
                },
            },
            '/admin/payments/{id}/refunds': {
                get: {
                    operationId: 'listAdminPaymentRefunds',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                    responses: {
                        '200': {
                            description: 'Bounded refund ledger history for an admin payment.',
                            content: {
                                'application/json': {
                                    schema: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/AdminPaymentRefund' } },
                                },
                            },
                        },
                    },
                },
            },
            '/admin/payments/{id}/refund': {
                post: {
                    operationId: 'refundAdminPayment',
                    description: 'Super-admin-only financial mutation. Payment transition audit is idempotent.',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['reason'],
                                    additionalProperties: false,
                                    properties: {
                                        reason: { type: 'string', enum: ['duplicate', 'fraudulent', 'requested_by_customer'] },
                                        amountMinor: { type: 'integer', minimum: 1 },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Provider-confirmed refund result.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['paymentId', 'status', 'refundedAmountMinor'],
                                        additionalProperties: false,
                                        properties: {
                                            paymentId: { type: 'string', format: 'uuid' },
                                            status: { type: 'string' },
                                            refundedAmountMinor: { type: 'integer', minimum: 0 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/admin/payments/{id}/disputes': {
                get: {
                    operationId: 'listAdminPaymentDisputes',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
                    responses: {
                        '200': {
                            description: 'Bounded dispute history for an admin payment.',
                            content: {
                                'application/json': {
                                    schema: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/AdminPaymentDispute' } },
                                },
                            },
                        },
                    },
                },
            },
            '/admin/audit-logs': {
                get: { operationId: 'listAdminAuditLogs', parameters: adminAuditParameters, responses: { '200': { description: 'Legacy array or cursor page of audit logs.' } } },
            },
            '/admin/audit-logs/export': {
                get: {
                    operationId: 'exportAdminAuditLogs',
                    responses: {
                        '200': {
                            description: 'Bounded CSV audit-log export.',
                            content: { 'text/csv': { schema: { type: 'string' } } },
                        },
                    },
                },
            },
            '/admin/system-incidents': {
                get: { operationId: 'listAdminSystemIncidents', parameters: adminIncidentParameters, responses: { '200': { description: 'Legacy array or cursor page of incidents.' } } },
            },
            '/admin/security-events': {
                get: { operationId: 'listAdminSecurityEvents', parameters: adminSecurityEventParameters, responses: { '200': { description: 'No-store super-admin security event reader.' } } },
            },
            '/admin/security-center/summary': {
                get: { operationId: 'getAdminSecurityCenterSummary', responses: { '200': { description: 'Bounded super-admin attack visibility summary.' } } },
            },
            '/admin/security-center/events': {
                get: { operationId: 'listAdminSecurityCenterEvents', parameters: securityCenterEventParameters, responses: { '200': { description: 'No-store super-admin security activity list.', content: { 'application/json': { schema: { oneOf: [{ type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/SecurityCenterEvent' } }, { $ref: '#/components/schemas/SecurityCenterEventCursorPage' }] } } } } } },
            },
            '/admin/security-center/events/export': {
                get: { operationId: 'exportAdminSecurityCenterEvents', parameters: securityCenterExportParameters, responses: { '200': { description: 'Bounded redacted CSV security investigation report.', content: { 'text/csv': { schema: { type: 'string' } } } } } },
            },
            '/admin/security-center/mitigations': {
                get: { operationId: 'listAdminSecurityMitigations', parameters: securityMitigationParameters, responses: { '200': { description: 'No-store temporary security mitigations.', content: { 'application/json': { schema: { oneOf: [{ type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/SecurityMitigation' } }, { $ref: '#/components/schemas/SecurityMitigationCursorPage' }] } } } } } },
                post: { operationId: 'createAdminSecurityMitigation', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityMitigationCreate' } } } }, responses: { '200': { description: 'Created temporary security mitigation.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityMitigation' } } } } } },
            },
            '/admin/security-center/mitigations/{id}': {
                patch: { operationId: 'extendAdminSecurityMitigation', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityMitigationExtend' } } } }, responses: { '200': { description: 'Extended active temporary security mitigation.', headers: { 'Cache-Control': { schema: { type: 'string', example: 'no-store' } } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityMitigation' } } } } } },
                delete: { operationId: 'revokeAdminSecurityMitigation', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Revoked temporary security mitigation.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityMitigation' } } } } } },
            },
            '/admin/security-center/events/{id}': {
                get: { operationId: 'getAdminSecurityCenterEvent', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Security event detail.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityCenterEvent' } } } } } },
            },
            '/admin/security-center/events/{id}/status': {
                patch: { operationId: 'updateAdminSecurityCenterEventStatus', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityCenterEventStatusUpdate' } } } }, responses: { '200': { description: 'Updated investigation state and optional assignee for a security event.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityCenterEvent' } } } } } },
            },
            '/admin/security-center/users/{id}/revoke-sessions': {
                post: { operationId: 'revokeAdminSecurityCenterUserSessions', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'No-store response after revoking all sessions for an investigated user.', headers: { 'Cache-Control': { schema: { type: 'string', example: 'no-store' } } }, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['userId', 'revokedAt'], properties: { userId: { type: 'string', format: 'uuid' }, revokedAt: { type: 'string', format: 'date-time' } } } } } } } },
            },
            '/users/me/export': {
                get: {
                    operationId: 'exportMyData',
                    responses: {
                        '200': {
                            description: 'Authenticated user data export.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserDataExport' } } },
                        },
                    },
                },
            },
            '/admin/outbox/health': {
                get: {
                    operationId: 'getAdminOutboxHealth',
                    responses: {
                        '200': {
                            description: 'Bounded outbox health and failed-event summary for admin operations.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/OutboxHealth' } } },
                        },
                    },
                },
            },
            '/users/me/deletion-request': {
                get: {
                    operationId: 'getMyDeletionRequest',
                    responses: {
                        '200': {
                            description: 'Pending deletion request or null.',
                            content: {
                                'application/json': {
                                    schema: {
                                        oneOf: [
                                            { $ref: '#/components/schemas/AccountDeletionRequest' },
                                            { type: 'null' },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    operationId: 'requestAccountDeletion',
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AccountDeletionRequestInput' },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Pending deletion request.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountDeletionRequest' } } },
                        },
                    },
                },
                delete: {
                    operationId: 'cancelAccountDeletion',
                    responses: {
                        '200': {
                            description: 'Cancelled deletion request or null.',
                            content: {
                                'application/json': {
                                    schema: {
                                        oneOf: [
                                            { $ref: '#/components/schemas/AccountDeletionRequest' },
                                            { type: 'null' },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            parameters: {
                Cursor: {
                    name: 'cursor',
                    in: 'query',
                    description: 'Opaque cursor returned in the previous page.',
                    required: false,
                    schema: { type: 'string', maxLength: 512 },
                },
                Limit: {
                    name: 'limit',
                    in: 'query',
                    description: 'Maximum number of items to return.',
                    required: false,
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
                },
                AdminPaymentSearch: {
                    name: 'search',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', maxLength: 120 },
                },
                AdminSearch: {
                    name: 'search',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', maxLength: 160 },
                },
                AdminIncidentStatus: {
                    name: 'status',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', enum: ['open', 'acknowledged', 'resolved'] },
                },
                AdminPaymentStatus: {
                    name: 'status',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', enum: ['pending', 'paid', 'failed', 'partially_refunded', 'refunded'] },
                },
                AdminDeletionStatus: {
                    name: 'status',
                    in: 'query',
                    required: false,
                    schema: { type: 'string', enum: ['pending', 'cancelled', 'completed'] },
                },
            },
            schemas: {
                SecurityCenterActionTimelineItem: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'status', 'operatorNote', 'actorId', 'assigneeId', 'createdAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['acknowledged', 'investigating', 'resolved', 'suppressed'] },
                        operatorNote: { type: ['string', 'null'], maxLength: 1_000 },
                        actorId: { type: 'string', format: 'uuid' },
                        assigneeId: { type: ['string', 'null'], format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                SecurityCenterRelatedAuditLog: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'action', 'targetType', 'correlationId', 'createdAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        action: { type: 'string' },
                        targetType: { type: ['string', 'null'] },
                        correlationId: { type: ['string', 'null'] },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                SecurityCenterRelatedSystemIncident: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'type', 'severity', 'status', 'title', 'requestId', 'occurrenceCount', 'firstOccurredAt', 'lastOccurredAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        type: { type: 'string', enum: ['server_error', 'health_check', 'background_job', 'payment_webhook'] },
                        severity: { type: 'string', enum: ['warning', 'critical'] },
                        status: { type: 'string', enum: ['open', 'acknowledged', 'resolved'] },
                        title: { type: 'string', maxLength: 240 },
                        requestId: { type: ['string', 'null'] },
                        occurrenceCount: { type: 'integer', minimum: 0 },
                        firstOccurredAt: { type: 'string', format: 'date-time' },
                        lastOccurredAt: { type: 'string', format: 'date-time' },
                    },
                },
                SecurityCenterLastAction: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['status', 'operatorNote', 'actorId', 'assigneeId', 'createdAt'],
                    properties: {
                        status: { type: 'string', enum: ['acknowledged', 'investigating', 'resolved', 'suppressed'] },
                        operatorNote: { type: ['string', 'null'], maxLength: 1_000 },
                        actorId: { type: 'string', format: 'uuid' },
                        assigneeId: { type: ['string', 'null'], format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                SecurityCenterEvent: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                        'id', 'userId', 'type', 'severity', 'status', 'assigneeId', 'failedLoginAttempts',
                        'lockedUntil', 'ipAddress', 'userAgent', 'correlationId', 'requestId',
                        'method', 'route', 'statusCode', 'actorRole', 'authOutcome',
                        'rateLimitResult', 'requestSizeBytes', 'reasonCode', 'proxyProvenance',
                        'metadata', 'createdAt', 'actionTimeline', 'relatedAuditLogs',
                        'relatedSystemIncidents', 'lastAction',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: ['string', 'null'], format: 'uuid' },
                        type: { type: 'string', enum: ['login_failed', 'account_locked', 'refresh_token_reuse', 'rate_limit_exceeded', 'invalid_token', 'csrf_violation', 'route_scan', 'malformed_request', 'oversized_request', 'privilege_denied', 'webhook_abuse', 'mutation_burst'] },
                        severity: { type: 'string', enum: ['info', 'warning', 'high', 'critical'] },
                        status: { type: 'string', enum: ['open', 'acknowledged', 'investigating', 'resolved', 'suppressed'] },
                        assigneeId: { type: ['string', 'null'], format: 'uuid' },
                        failedLoginAttempts: { type: ['integer', 'null'], minimum: 0 },
                        lockedUntil: { type: ['string', 'null'], format: 'date-time' },
                        ipAddress: { type: ['string', 'null'] },
                        userAgent: { type: ['string', 'null'], maxLength: 512 },
                        correlationId: { type: ['string', 'null'] },
                        requestId: { type: ['string', 'null'] },
                        method: { type: ['string', 'null'] },
                        route: { type: ['string', 'null'] },
                        statusCode: { type: ['integer', 'null'], minimum: 100, maximum: 599 },
                        actorRole: { type: ['string', 'null'], enum: ['client', 'owner', 'admin', 'super_admin', null] },
                        authOutcome: { type: 'string', enum: ['unknown', 'anonymous', 'authenticated', 'failed'] },
                        rateLimitResult: { type: 'string', enum: ['not_checked', 'allowed', 'blocked'] },
                        requestSizeBytes: { type: ['integer', 'null'], minimum: 0 },
                        reasonCode: { type: ['string', 'null'], maxLength: 120 },
                        proxyProvenance: { type: 'string', enum: ['unknown', 'direct', 'trusted_proxy', 'forwarded_header_untrusted'] },
                        metadata: { type: 'object', additionalProperties: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        actionTimeline: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/SecurityCenterActionTimelineItem' } },
                        relatedAuditLogs: { type: 'array', maxItems: 50, items: { $ref: '#/components/schemas/SecurityCenterRelatedAuditLog' } },
                        relatedSystemIncidents: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/SecurityCenterRelatedSystemIncident' } },
                        lastAction: { oneOf: [{ $ref: '#/components/schemas/SecurityCenterLastAction' }, { type: 'null' }] },
                    },
                },
                SecurityCenterEventCursorPage: {
                    allOf: [
                        { $ref: '#/components/schemas/CursorPage' },
                        { type: 'object', properties: { items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/SecurityCenterEvent' } } } },
                    ],
                },
                SecurityMitigationCreate: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['ipAddress', 'reason', 'ttlMinutes'],
                    properties: {
                        kind: { type: 'string', enum: ['ip_block'], default: 'ip_block' },
                        ipAddress: { type: 'string', minLength: 3, maxLength: 64 },
                        reason: { type: 'string', minLength: 1, maxLength: 500 },
                        ttlMinutes: { type: 'integer', minimum: 1, maximum: 1_440, default: 60 },
                    },
                },
                SecurityMitigationExtend: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['extensionMinutes'],
                    properties: {
                        extensionMinutes: { type: 'integer', minimum: 1, maximum: 1_440 },
                    },
                },
                SecurityCenterEventStatusUpdate: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['status'],
                    properties: {
                        status: { type: 'string', enum: ['acknowledged', 'investigating', 'resolved', 'suppressed'] },
                        operatorNote: { type: 'string', maxLength: 1_000 },
                        assigneeId: { type: ['string', 'null'], format: 'uuid' },
                    },
                },
                SecurityMitigation: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'kind', 'displayValue', 'reason', 'expiresAt', 'revokedAt', 'createdBy', 'revokedBy', 'createdAt', 'status'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        kind: { type: 'string', enum: ['ip_block'] },
                        displayValue: { type: 'string', minLength: 3, maxLength: 64 },
                        reason: { type: 'string', minLength: 1, maxLength: 500 },
                        expiresAt: { type: 'string', format: 'date-time' },
                        revokedAt: { type: ['string', 'null'], format: 'date-time' },
                        createdBy: { type: 'string', format: 'uuid' },
                        revokedBy: { type: ['string', 'null'], format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['active', 'expired', 'revoked'] },
                    },
                },
                SecurityMitigationCursorPage: {
                    allOf: [
                        { $ref: '#/components/schemas/CursorPage' },
                        { type: 'object', properties: { items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/SecurityMitigation' } } } },
                    ],
                },
                HealthLiveResponse: {
                    type: 'object',
                    required: ['status', 'service'],
                    properties: {
                        status: { type: 'string', enum: ['ok'] },
                        service: { type: 'string', enum: ['autocare-hub-api'] },
                    },
                },
                OwnerReadiness: {
                    type: 'object',
                    required: ['ready', 'blockers', 'checks'],
                    properties: {
                        ready: { type: 'boolean' },
                        blockers: {
                            type: 'array',
                            maxItems: 5,
                            items: {
                                type: 'string',
                                enum: ['email_verification', 'active_cabinet', 'active_service', 'schedule', 'payout_account'],
                            },
                        },
                        checks: {
                            type: 'object',
                            required: ['emailVerified', 'activeCabinet', 'activeService', 'scheduleConfigured', 'payoutAccount'],
                            properties: {
                                emailVerified: { type: 'boolean' },
                                activeCabinet: { type: 'boolean' },
                                activeService: { type: 'boolean' },
                                scheduleConfigured: { type: 'boolean' },
                                payoutAccount: { type: 'string', enum: ['ready', 'not_connected', 'pending', 'unavailable'] },
                            },
                        },
                    },
                },
                ClientBookingPaymentStatus: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['status', 'grossAmount', 'refundedAmountMinor', 'remainingAmountMinor', 'currency', 'createdAt', 'invoice', 'attempts'],
                    properties: {
                        status: { type: ['string', 'null'], enum: ['pending', 'paid', 'failed', 'partially_refunded', 'refunded', null] },
                        grossAmount: { type: ['integer', 'null'], minimum: 0 },
                        refundedAmountMinor: { type: 'integer', minimum: 0 },
                        remainingAmountMinor: { type: ['integer', 'null'], minimum: 0 },
                        currency: { type: ['string', 'null'], minLength: 3, maxLength: 3 },
                        createdAt: { type: ['string', 'null'], format: 'date-time' },
                        invoice: {
                            oneOf: [
                                { type: 'null' },
                                {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: ['invoiceId', 'amount', 'currency', 'status', 'issuedAt'],
                                    properties: {
                                        invoiceId: { type: 'string', minLength: 1 },
                                        amount: { type: 'integer', minimum: 0 },
                                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                                        status: { type: 'string', enum: ['open', 'paid', 'void'] },
                                        issuedAt: { type: 'string', format: 'date-time' },
                                    },
                                },
                            ],
                        },
                        attempts: {
                            type: 'array',
                            maxItems: 20,
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['attemptNumber', 'status', 'createdAt'],
                                properties: {
                                    attemptNumber: { type: 'integer', minimum: 1 },
                                    status: { type: 'string', enum: ['creating', 'created', 'failed', 'paid', 'expired'] },
                                    createdAt: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                    },
                },
                OwnerPaymentLedger: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['grossAmount', 'commissionAmount', 'ownerPayoutAmount', 'refundedAmountMinor', 'remainingAmountMinor', 'currency', 'status', 'createdAt'],
                    properties: {
                        grossAmount: { type: 'integer', minimum: 0 },
                        commissionAmount: { type: 'integer', minimum: 0 },
                        ownerPayoutAmount: { type: 'integer', minimum: 0 },
                        refundedAmountMinor: { type: 'integer', minimum: 0 },
                        remainingAmountMinor: { type: 'integer', minimum: 0 },
                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                        status: { type: 'string', enum: ['pending', 'paid', 'failed', 'partially_refunded', 'refunded'] },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                OutboxHealth: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['counts', 'abandonedCount', 'deadLetterCount', 'failedEvents'],
                    properties: {
                        counts: { type: 'object', additionalProperties: { type: 'integer', minimum: 0 } },
                        abandonedCount: { type: 'integer', minimum: 0 },
                        deadLetterCount: { type: 'integer', minimum: 0 },
                        failedEvents: {
                            type: 'array',
                            maxItems: 100,
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['id', 'type', 'idempotencyKey', 'status', 'attempts', 'availableAt', 'lockedAt', 'processedAt', 'lastError', 'createdAt'],
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    type: { type: 'string' },
                                    idempotencyKey: { type: ['string', 'null'] },
                                    status: { type: 'string' },
                                    attempts: { type: 'integer', minimum: 0 },
                                    availableAt: { type: 'string', format: 'date-time' },
                                    lockedAt: { type: ['string', 'null'], format: 'date-time' },
                                    processedAt: { type: ['string', 'null'], format: 'date-time' },
                                    lastError: { type: ['string', 'null'] },
                                    createdAt: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                    },
                },
                OwnerBooking: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'clientId', 'cabinetId', 'serviceId', 'date', 'startTime', 'endTime', 'status', 'comment', 'cancellationReason', 'createdAt', 'cabinet', 'service', 'ownerNote', 'client', 'paymentLedger'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        clientId: { type: 'string', format: 'uuid' },
                        cabinetId: { type: 'string', format: 'uuid' },
                        serviceId: { type: 'string', format: 'uuid' },
                        date: { type: 'string', format: 'date' },
                        startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                        endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
                        comment: { type: ['string', 'null'] },
                        cancellationReason: { type: ['string', 'null'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        cabinet: {
                            type: 'object',
                            required: ['id', 'title', 'address', 'city'],
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                title: { type: 'string' },
                                address: { type: 'string' },
                                city: { type: 'string' },
                            },
                        },
                        service: {
                            type: 'object',
                            required: ['id', 'title', 'durationMinutes', 'price'],
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                title: { type: 'string' },
                                durationMinutes: { type: 'integer', minimum: 1 },
                                price: { type: 'integer', minimum: 0 },
                            },
                        },
                        ownerNote: { type: ['string', 'null'] },
                        client: {
                            type: 'object',
                            required: ['id', 'name', 'email', 'phone'],
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                                email: { type: 'string' },
                                phone: { type: ['string', 'null'] },
                            },
                        },
                        paymentLedger: {
                            oneOf: [
                                { $ref: '#/components/schemas/OwnerPaymentLedger' },
                                { type: 'null' },
                            ],
                        },
                    },
                },
                OwnerBookingCursorPage: {
                    allOf: [
                        { $ref: '#/components/schemas/CursorPage' },
                        { type: 'object', properties: { items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/OwnerBooking' } } } },
                    ],
                },
                OwnerActionCenterEvent: {
                    type: 'object',
                    required: ['action'],
                    additionalProperties: false,
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['pending_bookings', 'reschedule_requests', 'draft_cabinets', 'blocked_cabinets', 'readiness'],
                        },
                    },
                },
                OwnerActionCenterEventResponse: {
                    type: 'object',
                    required: ['accepted'],
                    additionalProperties: false,
                    properties: {
                        accepted: { type: 'boolean', enum: [true] },
                    },
                },
                ClientExperimentEvent: {
                    type: 'object',
                    required: ['event'],
                    additionalProperties: false,
                    properties: {
                        event: {
                            type: 'string',
                            enum: [
                                'book_again_clicked',
                                'preference_shortcut_used',
                                'preference_shortcut_reset',
                                'catalog_filter_used',
                                'catalog_filter_reset',
                                'catalog_search_to_detail',
                                'catalog_search_to_book',
                                'catalog_no_results',
                            ],
                        },
                    },
                },
                ClientExperimentEventResponse: {
                    type: 'object',
                    required: ['accepted'],
                    additionalProperties: false,
                    properties: {
                        accepted: { type: 'boolean', enum: [true] },
                    },
                },
                HealthProbe: {
                    type: 'object',
                    required: ['status', 'latencyMs'],
                    properties: {
                        status: { type: 'string', enum: ['ok', 'failed', 'skipped'] },
                        latencyMs: { type: 'integer', minimum: 0 },
                        reason: { type: 'string', enum: ['timeout', 'unavailable', 'not_connected', 'not_configured', 'database_unavailable'] },
                    },
                },
                OutboxHealthProbe: {
                    allOf: [
                        { $ref: '#/components/schemas/HealthProbe' },
                        {
                            type: 'object',
                            required: ['pending', 'deadLetter', 'oldestAgeMs'],
                            properties: {
                                pending: { type: ['integer', 'null'], minimum: 0 },
                                deadLetter: { type: ['integer', 'null'], minimum: 0 },
                                oldestAgeMs: { type: ['integer', 'null'], minimum: 0 },
                            },
                        },
                    ],
                },
                HealthResponse: {
                    type: 'object',
                    required: ['status', 'service', 'database', 'checks'],
                    properties: {
                        status: { type: 'string', enum: ['ok', 'degraded'] },
                        service: { type: 'string', enum: ['autocare-hub-api'] },
                        database: { type: 'string', enum: ['connected', 'disconnected'] },
                        checks: {
                            type: 'object',
                            required: ['database', 'redis', 'outbox', 'storage'],
                            properties: {
                                database: { $ref: '#/components/schemas/HealthProbe' },
                                redis: { $ref: '#/components/schemas/HealthProbe' },
                                outbox: { $ref: '#/components/schemas/OutboxHealthProbe' },
                                storage: { $ref: '#/components/schemas/HealthProbe' },
                            },
                        },
                    },
                },
                UserDataExport: {
                    type: 'object',
                    required: ['schemaVersion', 'generatedAt', 'limits', 'truncated', 'user', 'favorites', 'bookings', 'notifications', 'cabinets'],
                    properties: {
                        schemaVersion: { type: 'integer', enum: [1] },
                        generatedAt: { type: 'string', format: 'date-time' },
                        limits: {
                            type: 'object',
                            required: ['maxRecordsPerCollection'],
                            properties: {
                                maxRecordsPerCollection: { type: 'integer', minimum: 1, maximum: 5_000 },
                            },
                        },
                        truncated: {
                            type: 'object',
                            required: ['favorites', 'bookings', 'notifications', 'cabinets'],
                            properties: {
                                favorites: { type: 'boolean' },
                                bookings: { type: 'boolean' },
                                notifications: { type: 'boolean' },
                                cabinets: { type: 'boolean' },
                            },
                        },
                        user: { $ref: '#/components/schemas/PublicUser' },
                        favorites: { type: 'array', items: { type: 'object' } },
                        bookings: { type: 'array', items: { type: 'object' } },
                        notifications: { type: 'array', items: { type: 'object' } },
                        cabinets: { type: 'array', items: { type: 'object' } },
                    },
                },
                PublicUser: {
                    type: 'object',
                    required: ['id', 'name', 'email', 'role', 'status', 'provider'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: ['string', 'null'] },
                        role: { type: 'string', enum: ['client', 'owner', 'admin', 'super_admin'] },
                        status: { type: 'string', enum: ['active', 'blocked'] },
                        avatarUrl: { type: ['string', 'null'] },
                        locale: { type: ['string', 'null'], enum: ['en', 'ru', 'ro', 'es', 'de', 'fr', 'pt', 'zh', 'ja', 'ko', 'ar', 'tr', 'hi', null] },
                        provider: { type: 'string', enum: ['email', 'google', 'yandex'] },
                        emailVerifiedAt: { type: ['string', 'null'], format: 'date-time' },
                        emailNotifications: { type: 'boolean' },
                        bookingEmailNotifications: { type: 'boolean' },
                        preferredCity: { type: ['string', 'null'] },
                        preferredCategories: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                AccountDeletionRequestInput: {
                    type: 'object',
                    properties: {
                        reason: { type: 'string', maxLength: 500 },
                    },
                    additionalProperties: false,
                },
                AccountDeletionRequest: {
                    type: 'object',
                    required: ['id', 'status', 'requestedAt', 'cancelledAt', 'completedAt'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['pending', 'cancelled', 'completed'] },
                        requestedAt: { type: 'string', format: 'date-time' },
                        cancelledAt: { type: ['string', 'null'], format: 'date-time' },
                        completedAt: { type: ['string', 'null'], format: 'date-time' },
                    },
                },
                AdminDeletionRequestStatusUpdate: {
                    type: 'object',
                    required: ['status'],
                    additionalProperties: false,
                    properties: {
                        status: { type: 'string', enum: ['cancelled', 'completed'] },
                    },
                },
                AdminDeletionRequest: {
                    allOf: [
                        { $ref: '#/components/schemas/AccountDeletionRequest' },
                        {
                            type: 'object',
                            required: ['userId', 'user', 'reason'],
                            properties: {
                                userId: { type: 'string', format: 'uuid' },
                                user: {
                                    type: 'object',
                                    required: ['id', 'name', 'email'],
                                    properties: {
                                        id: { type: 'string', format: 'uuid' },
                                        name: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                    },
                                },
                                reason: { type: ['string', 'null'] },
                            },
                        },
                    ],
                },
                CursorPage: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['items', 'nextCursor'],
                    properties: {
                        items: { type: 'array', maxItems: MAX_CURSOR_PAGE_LIMIT, items: {} },
                        nextCursor: { type: ['string', 'null'], maxLength: MAX_CURSOR_LENGTH },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    required: ['statusCode', 'code', 'message', 'requestId'],
                    properties: {
                        statusCode: { type: 'integer' },
                        code: { type: 'string' },
                        message: { type: 'string' },
                        requestId: { type: 'string' },
                    },
                },
                AdminPaymentParty: {
                    type: 'object',
                    required: ['id', 'name', 'email'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                    },
                },
                PaymentRecoveryAttempt: {
                    type: 'object',
                    required: ['attemptNumber', 'status', 'createdAt'],
                    additionalProperties: false,
                    properties: {
                        attemptNumber: { type: 'integer', minimum: 1 },
                        status: { type: 'string', enum: ['creating', 'created', 'failed', 'paid', 'expired'] },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                PaymentRecoveryTimeline: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PaymentRecoveryAttempt' },
                    maxItems: 100,
                },
                AdminPayment: {
                    type: 'object',
                    required: [
                        'id', 'bookingId', 'client', 'owner', 'cabinetTitle',
                        'serviceTitle', 'date', 'startTime', 'endTime',
                        'grossAmount', 'refundedAmountMinor', 'remainingAmountMinor', 'commissionAmount', 'ownerPayoutAmount',
                        'currency', 'status', 'stripeSessionId',
                        'stripePaymentIntentId', 'createdAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        bookingId: { type: 'string', format: 'uuid' },
                        client: { $ref: '#/components/schemas/AdminPaymentParty' },
                        owner: { $ref: '#/components/schemas/AdminPaymentParty' },
                        cabinetTitle: { type: 'string' },
                        serviceTitle: { type: 'string' },
                        date: { type: 'string', format: 'date' },
                        startTime: { type: 'string' },
                        endTime: { type: 'string' },
                        grossAmount: { type: 'number' },
                        refundedAmountMinor: { type: 'integer', minimum: 0 },
                        remainingAmountMinor: { type: 'integer', minimum: 0 },
                        commissionAmount: { type: 'number' },
                        ownerPayoutAmount: { type: 'number' },
                        currency: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'paid', 'failed', 'partially_refunded', 'refunded'] },
                        stripeSessionId: { type: ['string', 'null'] },
                        stripePaymentIntentId: { type: ['string', 'null'] },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                AdminPaymentRefund: {
                    type: 'object',
                    required: [
                        'id', 'paymentId', 'bookingId', 'providerRefundId',
                        'providerChargeId', 'amountMinor', 'currency', 'reason',
                        'status', 'createdAt', 'updatedAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        paymentId: { type: 'string', format: 'uuid' },
                        bookingId: { type: 'string', format: 'uuid' },
                        providerRefundId: { type: 'string' },
                        providerChargeId: { type: ['string', 'null'] },
                        amountMinor: { type: 'integer', minimum: 1 },
                        currency: { type: 'string' },
                        reason: { type: ['string', 'null'] },
                        status: { type: 'string', enum: ['pending', 'succeeded', 'failed', 'canceled'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                AdminPaymentDispute: {
                    type: 'object',
                    required: [
                        'id', 'paymentId', 'bookingId', 'providerDisputeId',
                        'providerChargeId', 'amountMinor', 'currency', 'reason',
                        'providerStatus', 'status', 'lastEventId', 'lastEventCreatedAt',
                        'createdAt', 'updatedAt',
                    ],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        paymentId: { type: 'string', format: 'uuid' },
                        bookingId: { type: 'string', format: 'uuid' },
                        providerDisputeId: { type: 'string' },
                        providerChargeId: { type: ['string', 'null'] },
                        amountMinor: { type: 'integer', minimum: 1 },
                        currency: { type: 'string' },
                        reason: { type: 'string' },
                        providerStatus: { type: 'string' },
                        status: { type: 'string', enum: ['open', 'funds_withdrawn', 'funds_reinstated', 'closed'] },
                        lastEventId: { type: 'string' },
                        lastEventCreatedAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                AdminPaymentAttention: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['failedPaymentCount', 'openDisputeCount', 'fundsWithdrawnDisputeCount'],
                    properties: {
                        failedPaymentCount: { type: 'integer', minimum: 0 },
                        openDisputeCount: { type: 'integer', minimum: 0 },
                        fundsWithdrawnDisputeCount: { type: 'integer', minimum: 0 },
                    },
                },
                AdminPaymentCursorPage: {
                    allOf: [
                        { $ref: '#/components/schemas/CursorPage' },
                        {
                            type: 'object',
                            properties: {
                                items: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/AdminPayment' },
                                },
                            },
                        },
                    ],
                },
            },
            headers: {
                RequestId: {
                    description: 'Correlation identifier returned with every API response.',
                    schema: { type: 'string' },
                },
                RateLimitLimit: {
                    description: 'Maximum requests allowed in the current rate-limit window.',
                    schema: { type: 'integer', minimum: 1 },
                },
                RateLimitRemaining: {
                    description: 'Requests remaining in the current rate-limit window.',
                    schema: { type: 'integer', minimum: 0 },
                },
                RateLimitReset: {
                    description: 'Unix timestamp when the current rate-limit window resets.',
                    schema: { type: 'integer', minimum: 0 },
                },
                RetryAfter: {
                    description: 'Seconds to wait before retrying a rate-limited request.',
                    schema: { type: 'integer', minimum: 1 },
                },
            },
            responses: {
                BadRequest: {
                    description: 'The request failed validation.',
                    headers: { 'X-Request-Id': { $ref: '#/components/headers/RequestId' } },
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                Unauthorized: {
                    description: 'Authentication is required or invalid.',
                    headers: { 'X-Request-Id': { $ref: '#/components/headers/RequestId' } },
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                Forbidden: {
                    description: 'The authenticated user cannot access this resource.',
                    headers: { 'X-Request-Id': { $ref: '#/components/headers/RequestId' } },
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                TooManyRequests: {
                    description: 'The caller exceeded a rate limit.',
                    headers: {
                        'X-Request-Id': { $ref: '#/components/headers/RequestId' },
                        'RateLimit-Limit': { $ref: '#/components/headers/RateLimitLimit' },
                        'RateLimit-Remaining': { $ref: '#/components/headers/RateLimitRemaining' },
                        'RateLimit-Reset': { $ref: '#/components/headers/RateLimitReset' },
                        'Retry-After': { $ref: '#/components/headers/RetryAfter' },
                    },
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                ServerError: {
                    description: 'The server could not complete the request.',
                    headers: { 'X-Request-Id': { $ref: '#/components/headers/RequestId' } },
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
            },
        },
    } as const
}

export async function openApiRoutes(app: FastifyInstance) {
    app.get('/openapi.json', async (_request, reply) =>
        reply.type('application/json').send(getOpenApiDocument())
    )
}
