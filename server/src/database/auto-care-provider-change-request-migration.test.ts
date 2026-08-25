import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareProviderChangeRequests1786090000000 } from './migrations/1786090000000-CreateAutoCareProviderChangeRequests.js'

describe('AutoCare provider change request migration', () => {
    it('creates a reviewable provider workflow with one pending request per kind', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new CreateAutoCareProviderChangeRequests1786090000000().up({ query } as never)
        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('autocare_provider_change_requests'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_provider_change_requests_pending_kind'))).toBe(true)
        expect(statements.some((sql) => sql.includes('FK_autocare_provider_change_requests_reviewed_by'))).toBe(true)
    })

    it('rolls back indexes, table and enums in reverse dependency order', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new CreateAutoCareProviderChangeRequests1786090000000().down({ query } as never)
        expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
            'DROP INDEX "public"."UQ_autocare_provider_change_requests_pending_kind"',
            'DROP INDEX "public"."IDX_autocare_provider_change_requests_kind_status"',
            'DROP INDEX "public"."IDX_autocare_provider_change_requests_provider_status"',
            'DROP TABLE "autocare_provider_change_requests"',
            'DROP TYPE "autocare_provider_change_request_status"',
            'DROP TYPE "autocare_provider_change_request_kind"',
        ])
    })
})
