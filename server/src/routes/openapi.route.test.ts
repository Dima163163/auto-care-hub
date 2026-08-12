import { describe, expect, it } from 'vitest'

import { getOpenApiDocument } from './openapi.route.js'

describe('OpenAPI document', () => {
    it('declares the core contract and security scheme', () => {
        const document = getOpenApiDocument()

        expect(document.openapi).toBe('3.1.0')
        expect(document.paths['/admin/users']).toBeDefined()
        expect(document.paths['/admin/account-deletion-requests'].get.operationId).toBe('listAdminAccountDeletionRequests')
        expect(document.paths['/admin/account-deletion-requests/{id}/status'].patch.operationId).toBe('updateAdminAccountDeletionRequestStatus')
        expect(document.paths['/admin/system-incidents']).toBeDefined()
        expect(document.paths['/admin/payments/{id}/refunds'].get.operationId).toBe('listAdminPaymentRefunds')
        expect(document.paths['/admin/payments/{id}/refund'].post.operationId).toBe('refundAdminPayment')
        expect(document.paths['/admin/payments/{id}/refund'].post.requestBody.content['application/json'].schema.properties.reason.enum).toEqual([
            'duplicate',
            'fraudulent',
            'requested_by_customer',
        ])
        expect(document.paths['/admin/payments/{id}/disputes'].get.operationId).toBe('listAdminPaymentDisputes')
        expect(document.paths['/admin/security-events'].get.operationId).toBe('listAdminSecurityEvents')
        expect(document.paths['/admin/security-center/events/export'].get.operationId).toBe('exportAdminSecurityCenterEvents')
        expect(document.paths['/bookings/{id}/payment/status'].get.responses['200'].content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/ClientBookingPaymentStatus',
        })
        expect(document.components.schemas.ClientBookingPaymentStatus.properties.invoice.oneOf).toBeDefined()
        expect(document.paths['/owner/bookings'].get.responses['200'].content['application/json'].schema.oneOf).toBeDefined()
        expect(document.components.schemas.OwnerBooking.properties.paymentLedger.oneOf).toBeDefined()
        expect(document.components.schemas.OwnerPaymentLedger.properties).not.toHaveProperty('stripePaymentIntentId')
        expect(document.paths['/admin/outbox/health'].get.operationId).toBe('getAdminOutboxHealth')
        expect(document.paths['/admin/outbox/health'].get.responses['200'].content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/OutboxHealth',
        })
        expect(document.paths['/admin/security-center/events/export'].get.parameters).toEqual(expect.arrayContaining([
            { $ref: '#/components/parameters/Limit' },
            expect.objectContaining({ name: 'requestId', in: 'query' }),
        ]))
        expect(document.paths['/admin/security-center/events/export'].get.parameters).not.toContainEqual({
            $ref: '#/components/parameters/Cursor',
        })
        expect(document.paths['/admin/security-center/events/{id}'].get.responses['200'].content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/SecurityCenterEvent',
        })
        expect(document.paths['/admin/security-center/events/{id}/status'].patch.requestBody.content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/SecurityCenterEventStatusUpdate',
        })
        expect(document.components.schemas.SecurityCenterEventStatusUpdate.properties.assigneeId).toMatchObject({
            type: ['string', 'null'],
            format: 'uuid',
        })
        expect(document.components.schemas.SecurityCenterEvent.properties.assigneeId).toMatchObject({
            type: ['string', 'null'],
            format: 'uuid',
        })
        expect(document.components.schemas.SecurityCenterEvent.properties.actionTimeline).toMatchObject({ maxItems: 20 })
        expect(document.components.schemas.SecurityCenterEvent.properties.relatedAuditLogs).toMatchObject({ maxItems: 50 })
        expect(document.paths['/admin/security-center/mitigations'].get.operationId).toBe('listAdminSecurityMitigations')
        expect(document.paths['/admin/security-center/mitigations'].post.requestBody.content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/SecurityMitigationCreate',
        })
        expect(document.paths['/admin/security-center/mitigations'].get.parameters).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'status', in: 'query' }),
            expect.objectContaining({ name: 'ipAddress', in: 'query' }),
        ]))
        expect(document.components.schemas.SecurityMitigationCreate.properties.ttlMinutes).toMatchObject({ maximum: 1_440 })
        expect(document.paths['/admin/security-center/mitigations/{id}'].patch.operationId).toBe('extendAdminSecurityMitigation')
        expect(document.paths['/admin/security-center/mitigations/{id}'].patch.requestBody.content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/SecurityMitigationExtend',
        })
        expect(document.components.schemas.SecurityMitigationExtend.properties.extensionMinutes).toMatchObject({ maximum: 1_440 })
        expect(document.paths['/admin/security-center/mitigations/{id}'].patch.responses['200'].headers['Cache-Control']).toMatchObject({
            schema: { example: 'no-store' },
        })
        expect(document.paths['/admin/security-center/mitigations/{id}'].delete.operationId).toBe('revokeAdminSecurityMitigation')
        expect(document.paths['/admin/security-center/users/{id}/revoke-sessions'].post.operationId).toBe('revokeAdminSecurityCenterUserSessions')
        expect(document.paths['/admin/security-center/users/{id}/revoke-sessions'].post.responses['200'].headers['Cache-Control']).toMatchObject({
            schema: { example: 'no-store' },
        })
        expect(document.paths['/admin/security-center/events'].get.parameters).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'actorRole', in: 'query' }),
            expect.objectContaining({ name: 'requestId', in: 'query' }),
            expect.objectContaining({ name: 'authOutcome', in: 'query' }),
            expect.objectContaining({ name: 'rateLimitResult', in: 'query' }),
        ]))
        expect(document.paths['/health/ready'].get.responses['503'].content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/HealthResponse',
        })
        expect(document.paths['/owner/action-center/events'].post.operationId).toBe('recordOwnerActionCenterEvent')
        expect(document.paths['/owner/action-center/events'].post.requestBody.content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/OwnerActionCenterEvent',
        })
        expect(document.components.schemas.OwnerActionCenterEvent.properties.action.enum).toContain('readiness')
        expect(document.paths['/client/experiment-events'].post.operationId).toBe('recordClientExperimentEvent')
        expect(document.paths['/client/experiment-events'].post.requestBody.content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/ClientExperimentEvent',
        })
        expect(document.components.schemas.ClientExperimentEvent.properties.event.enum).toContain('book_again_clicked')
        expect(document.components.schemas.ClientExperimentEvent.properties.event.enum).toEqual(expect.arrayContaining([
            'catalog_filter_used',
            'catalog_filter_reset',
            'catalog_search_to_detail',
            'catalog_search_to_book',
            'catalog_no_results',
        ]))
        expect(document.paths['/admin/payments/attention'].get.operationId).toBe('getAdminPaymentAttention')
        expect(document.components.schemas.AdminPaymentAttention.required).toEqual([
            'failedPaymentCount',
            'openDisputeCount',
            'fundsWithdrawnDisputeCount',
        ])
        expect(document.paths['/admin/audit-logs/export'].get.operationId).toBe('exportAdminAuditLogs')
        expect(document.paths['/users/me/deletion-request'].post.operationId).toBe('requestAccountDeletion')
        expect(document.paths['/users/me/export'].get.responses['200'].content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/UserDataExport',
        })
        expect(document.components.securitySchemes.bearerAuth).toMatchObject({
            type: 'http',
            scheme: 'bearer',
        })
        expect(document.components.schemas.ErrorResponse.required).toContain('requestId')
        expect(document.components.responses.Unauthorized.content['application/json'].schema).toEqual({
            $ref: '#/components/schemas/ErrorResponse',
        })
        expect(document.components.headers.RequestId.schema).toEqual({ type: 'string' })
        expect(document.components.headers.RetryAfter.schema).toMatchObject({
            type: 'integer',
            minimum: 1,
        })
        expect(document.components.responses.TooManyRequests.headers['Retry-After']).toEqual({
            $ref: '#/components/headers/RetryAfter',
        })
        expect(document.components.parameters.Limit.schema).toMatchObject({
            type: 'integer',
            minimum: 1,
            maximum: 100,
        })
        expect(document.components.schemas.CursorPage).toMatchObject({
            additionalProperties: false,
            properties: {
                items: { type: 'array', maxItems: 100 },
                nextCursor: { type: ['string', 'null'], maxLength: 2_048 },
            },
        })
        expect(document.paths['/admin/audit-logs'].get.parameters).toEqual([
            { $ref: '#/components/parameters/Cursor' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/AdminSearch' },
        ])
        expect(document.paths['/admin/payments'].get.parameters).toContainEqual({
            $ref: '#/components/parameters/AdminPaymentStatus',
        })
        expect(document.components.schemas.AdminPayment.properties.status.enum).toEqual([
            'pending', 'paid', 'failed', 'partially_refunded', 'refunded',
        ])
        expect(document.components.schemas.AdminPaymentRefund.properties.amountMinor).toMatchObject({
            type: 'integer',
            minimum: 1,
        })
        expect(document.components.schemas.AdminPaymentDispute.properties.status.enum).toEqual([
            'open', 'funds_withdrawn', 'funds_reinstated', 'closed',
        ])
        expect(document.components.schemas.AdminDeletionRequestStatusUpdate.required).toEqual(['status'])
        expect(document.components.schemas.AdminDeletionRequest.allOf[1].properties.user).toBeDefined()
        expect(document.components.schemas.UserDataExport.properties.limits.properties.maxRecordsPerCollection).toMatchObject({
            minimum: 1,
            maximum: 5_000,
        })
    })
})
