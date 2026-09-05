import { describe, expect, it } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    auditLogsToCsv,
    getAuditLogs,
    getAuditLogsForExport,
    getAuditLogExportHeaders,
} from './audit-log.service.js'
import { auditLogsExportQuerySchema } from './admin.schemas.js'
import {
    assertAuditMetadataWithinBounds,
    normalizeAuditAction,
} from './audit-log-guards.js'

const client = { id: 'client-1', role: UserRole.Client } as UserEntity

describe('audit log export security', () => {
    it('accepts bounded machine-readable action names only', () => {
        expect(normalizeAuditAction(' user_status_updated ')).toBe('user_status_updated')
        expect(() => normalizeAuditAction('action with spaces')).toThrow(/invalid/)
        expect(() => normalizeAuditAction('a'.repeat(101))).toThrow(/invalid/)
    })

    it('rejects oversized audit metadata before persistence', () => {
        expect(() => assertAuditMetadataWithinBounds({ note: 'x'.repeat(20_000) }))
            .toThrow(/too large/)
        expect(assertAuditMetadataWithinBounds({ requestId: 'request-1' }))
            .toEqual({ requestId: 'request-1' })
    })

    it('rejects non-admin audit list access before touching the database', async () => {
        await expect(getAuditLogs(client)).rejects.toMatchObject({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
        })
    })

    it('rejects non-admin audit export access before touching the database', async () => {
        await expect(getAuditLogsForExport(client, {
            limit: 10,
        })).rejects.toMatchObject({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
        })
    })

    it('rejects malformed list and export input before opening the repository', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(getAuditLogs(admin, {
            action: 'invalid action',
        })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAuditLogs(admin, {
            actorId: 'actor-1',
        })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAuditLogsForExport(admin, {
            limit: 10,
            unexpected: true,
        })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAuditLogsForExport(admin, {
            limit: 10_001,
        })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('bounds export size and prevents spreadsheet formula injection', () => {
        expect(() => auditLogsExportQuerySchema.parse({ limit: 10_001 })).toThrow()

        const csv = auditLogsToCsv([{
            id: 'log-1',
            actorId: null,
            actor: { name: '=SUM(A1:A2)' },
            action: 'user_updated',
            targetId: null,
            targetType: null,
            metadata: { note: 'contains,comma' },
            ipAddress: null,
            userAgent: null,
            correlationId: null,
            createdAt: new Date('2026-07-28T00:00:00.000Z'),
        } as unknown as Parameters<typeof auditLogsToCsv>[0][number]])

        expect(csv).toContain('"\'=SUM(A1:A2)"')
        expect(csv).toContain('"{""note"":""contains,comma""}"')
    })

    it('marks CSV exports as private and non-cacheable', () => {
        expect(getAuditLogExportHeaders('2026-07-28')).toEqual({
            'cache-control': 'no-store',
            pragma: 'no-cache',
            'content-disposition': 'attachment; filename="audit-logs-2026-07-28.csv"',
        })
    })
})
