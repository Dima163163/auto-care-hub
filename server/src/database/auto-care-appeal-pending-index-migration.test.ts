import { describe, expect, it, vi } from 'vitest'

import { AddAutoCareAppealPendingUniqueIndex1786310000000 } from './migrations/1786310000000-AddAutoCareAppealPendingUniqueIndex.js'

describe('AutoCare appeal pending uniqueness migration', () => {
    it('creates a partial unique index for unresolved appeals', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareAppealPendingUniqueIndex1786310000000().up({ query } as never)

        const statement = String(query.mock.calls[0]?.[0])
        expect(statement).toContain('CREATE UNIQUE INDEX "UQ_autocare_appeals_pending_subject"')
        expect(statement).toContain('"autocare_appeals" ("submittedById", "subject", "subjectId")')
        expect(statement).toContain('WHERE "status" = \'pending\'')
    })

    it('drops the index on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareAppealPendingUniqueIndex1786310000000().down({ query } as never)

        expect(String(query.mock.calls[0]?.[0])).toContain('DROP INDEX IF EXISTS "public"."UQ_autocare_appeals_pending_subject"')
    })
})
