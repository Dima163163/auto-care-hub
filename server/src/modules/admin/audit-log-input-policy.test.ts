import { describe, expect, it } from 'vitest'

import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import {
    normalizeAdminAuditLogsQuery,
    normalizeAuditLogsExportQuery,
} from './audit-log-input-policy.js'

describe('Audit log input policy', () => {
    it('normalizes bounded list and export filters', () => {
        const actorId = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeAdminAuditLogsQuery({
            search: '  user\n updated ',
            action: ' USER_STATUS_UPDATED ',
            targetType: ' provider ',
            actorId: ` ${actorId.toUpperCase()} `,
            limit: 25,
        })).toEqual({
            search: 'user updated',
            action: AuditAction.UserStatusUpdated,
            targetType: 'provider',
            actorId,
            limit: 25,
        })
        expect(normalizeAuditLogsExportQuery({ limit: 2 })).toEqual({ limit: 2 })
    })

    it('rejects unknown keys, malformed UUIDs and invalid action values', () => {
        expect(normalizeAdminAuditLogsQuery({ extra: true })).toBeNull()
        expect(normalizeAdminAuditLogsQuery({ actorId: 'actor-1' })).toBeNull()
        expect(normalizeAdminAuditLogsQuery({ action: 'invalid action' })).toBeNull()
        expect(normalizeAuditLogsExportQuery({ limit: 10, extra: true })).toBeNull()
    })

    it('bounds pagination, search and export limits', () => {
        expect(normalizeAdminAuditLogsQuery({ limit: 0 })).toBeNull()
        expect(normalizeAdminAuditLogsQuery({ limit: 101 })).toBeNull()
        expect(normalizeAdminAuditLogsQuery({ cursor: 'x'.repeat(513) })).toBeNull()
        expect(normalizeAdminAuditLogsQuery({ search: 'x'.repeat(161) })).toBeNull()
        expect(normalizeAuditLogsExportQuery({ limit: 10_001 })).toBeNull()
    })

    it('uses the bounded default export limit and ignores blank optional filters', () => {
        expect(normalizeAuditLogsExportQuery({})).toEqual({ limit: 1_000 })
        expect(normalizeAdminAuditLogsQuery({ search: '  ', action: '  ', targetType: '  ' })).toEqual({})
    })
})
