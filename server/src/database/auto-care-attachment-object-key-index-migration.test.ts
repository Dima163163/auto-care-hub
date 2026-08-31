import { describe, expect, it, vi } from 'vitest'

import { AddAutoCareAttachmentObjectKeyIndex1786300000000 } from './migrations/1786300000000-AddAutoCareAttachmentObjectKeyIndex.js'

describe('AutoCare attachment object key index migration', () => {
    it('adds a non-unique object key index for retention reference counts', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareAttachmentObjectKeyIndex1786300000000().up({ query } as never)

        const statement = String(query.mock.calls[0]?.[0])
        expect(statement).toContain('CREATE INDEX "IDX_autocare_attachments_object_key"')
        expect(statement).toContain('"autocare_service_attachments" ("objectKey")')
    })

    it('drops the object key index on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareAttachmentObjectKeyIndex1786300000000().down({ query } as never)

        expect(String(query.mock.calls[0]?.[0])).toContain('DROP INDEX IF EXISTS "public"."IDX_autocare_attachments_object_key"')
    })
})
