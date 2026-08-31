import { describe, expect, it, vi } from 'vitest'

import { HardenAutoCareAttachmentChecksum1786290000000 } from './migrations/1786290000000-HardenAutoCareAttachmentChecksum.js'

describe('AutoCare attachment checksum migration', () => {
    it('adds a nullable SHA-256 format check without validating legacy rows', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new HardenAutoCareAttachmentChecksum1786290000000().up({ query } as never)

        const statement = String(query.mock.calls[0]?.[0])
        expect(statement).toContain('CHK_autocare_attachments_checksum')
        expect(statement).toContain('"checksum" IS NULL')
        expect(statement).toContain("'^[a-f0-9]{64}$'")
        expect(statement).toContain('NOT VALID')
    })

    it('drops the checksum check on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new HardenAutoCareAttachmentChecksum1786290000000().down({ query } as never)

        expect(String(query.mock.calls[0]?.[0])).toContain('DROP CONSTRAINT IF EXISTS "CHK_autocare_attachments_checksum"')
    })
})
