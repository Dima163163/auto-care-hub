import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareAppeals1786130000000 } from './migrations/1786130000000-CreateAutoCareAppeals.js'

describe('AutoCare appeals migration', () => {
    it('keeps appeals auditable and bounded', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new CreateAutoCareAppeals1786130000000().up({ query } as never)
        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('autocare_appeals'))).toBe(true)
        expect(statements.some((sql) => sql.includes('CHK_autocare_appeals_reason'))).toBe(true)
        expect(statements.some((sql) => sql.includes('FK_autocare_appeals_submitter'))).toBe(true)
        expect(statements.some((sql) => sql.includes('IDX_autocare_appeals_subject_status'))).toBe(true)
    })
})
