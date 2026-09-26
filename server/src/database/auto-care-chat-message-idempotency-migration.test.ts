import { describe, expect, it, vi } from 'vitest'

import { AddAutoCareChatMessageIdempotencyIndex1786350000000 } from './migrations/1786350000000-AddAutoCareChatMessageIdempotencyIndex.js'

describe('AutoCare chat message idempotency index migration', () => {
    it('adds a partial unique index scoped to generic chat thread and sender', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareChatMessageIdempotencyIndex1786350000000().up({ query } as never)

        expect(String(query.mock.calls[0]?.[0])).toBe(
            'CREATE UNIQUE INDEX "IDX_autocare_service_messages_thread_idempotency" ON "autocare_service_messages" ("threadId", "senderId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL',
        )
    })

    it('drops the generic chat index on rollback without touching the request-scoped index', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareChatMessageIdempotencyIndex1786350000000().down({ query } as never)

        expect(String(query.mock.calls[0]?.[0])).toBe(
            'DROP INDEX IF EXISTS "public"."IDX_autocare_service_messages_thread_idempotency"',
        )
    })
})
