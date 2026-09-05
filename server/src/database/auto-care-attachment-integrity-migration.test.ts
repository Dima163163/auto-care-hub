import { describe, expect, it, vi } from 'vitest'

import { HardenAutoCareAttachmentIntegrity1786280000000 } from './migrations/1786280000000-HardenAutoCareAttachmentIntegrity.js'

describe('AutoCare attachment integrity migration', () => {
    it('adds write-time MIME, object-key and parent-scope checks without validating legacy rows', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new HardenAutoCareAttachmentIntegrity1786280000000().up({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('CHK_autocare_attachments_content_type'))).toBe(true)
        expect(statements.some((sql) => sql.includes('CHK_autocare_attachments_object_key'))).toBe(true)
        expect(statements.some((sql) => sql.includes('split_part("objectKey"'))).toBe(true)
        expect(statements.some((sql) => sql.includes('split_part("objectKey", \'/\', 2) = "requestId"::text'))).toBe(true)
        expect(statements.some((sql) => sql.includes('split_part("objectKey", \'/\', 2) = "threadId"::text'))).toBe(true)
        expect(statements.every((sql) => sql.includes('NOT VALID') || sql.includes('DROP CONSTRAINT'))).toBe(true)
    })

    it('restores the parent-presence check on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new HardenAutoCareAttachmentIntegrity1786280000000().down({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.at(-1)).toContain('("requestId" IS NOT NULL) OR ("threadId" IS NOT NULL)')
        expect(statements.at(-1)).toContain('NOT VALID')
    })
})
