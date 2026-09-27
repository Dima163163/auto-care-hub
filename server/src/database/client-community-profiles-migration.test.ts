import { describe, expect, it, vi } from 'vitest'

import { ClientCommunityProfilesAndHelpfulVotes1786400000000 } from './migrations/1786400000000-ClientCommunityProfilesAndHelpfulVotes.js'

describe('client community profiles migration', () => {
    it('creates opt-in profile fields, an immutable vote identity pair and lookup indexes', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new ClientCommunityProfilesAndHelpfulVotes1786400000000().up({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements[0]).toContain("ALTER TYPE \"user_consent_type\" ADD VALUE IF NOT EXISTS 'community_profile'")
        expect(statements).toContain('ALTER TABLE "users" ADD COLUMN "communityProfileEnabled" boolean NOT NULL DEFAULT false')
        expect(statements).toContain('CREATE UNIQUE INDEX "UQ_users_community_profile_id" ON "users" ("communityProfileId")')
        expect(statements.some((sql) => sql.includes('UNIQUE ("reviewId", "voterUserId")'))).toBe(true)
        expect(statements).toContain('CREATE INDEX "IDX_autocare_review_helpful_votes_voter_created" ON "autocare_review_helpful_votes" ("voterUserId", "createdAt")')
    })

    it('removes feature tables and user fields on rollback while preserving the PostgreSQL enum value', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new ClientCommunityProfilesAndHelpfulVotes1786400000000().down({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements).toContain('DROP TABLE IF EXISTS "autocare_review_helpful_votes"')
        expect(statements).toContain('ALTER TABLE "users" DROP COLUMN IF EXISTS "communityProfileId"')
        expect(statements.some((sql) => sql.includes('user_consent_type'))).toBe(false)
    })
})
