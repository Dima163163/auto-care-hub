import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareProviderInvitations1786080000000 } from './migrations/1786080000000-CreateAutoCareProviderInvitations.js'

describe('AutoCare provider invitation migration', () => {
    it('creates scoped invitations with hashed-token and pending-scope guards', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateAutoCareProviderInvitations1786080000000().up({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('autocare_provider_invitations'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_provider_invitations_token_hash'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_provider_invitations_pending_scope'))).toBe(true)
        expect(statements.some((sql) => sql.includes('FK_autocare_provider_invitations_invited_by'))).toBe(true)
    })

    it('drops indexes, table and enums in dependency order', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateAutoCareProviderInvitations1786080000000().down({ query } as never)

        expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
            'DROP INDEX "public"."UQ_autocare_provider_invitations_pending_scope"',
            'DROP INDEX "public"."IDX_autocare_provider_invitations_email_status"',
            'DROP INDEX "public"."IDX_autocare_provider_invitations_provider_status"',
            'DROP TABLE "autocare_provider_invitations"',
            'DROP TYPE "autocare_provider_invitation_status"',
            'DROP TYPE "autocare_provider_invitation_role"',
        ])
    })
})
