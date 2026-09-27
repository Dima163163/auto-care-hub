import { describe, expect, it, vi } from 'vitest'

import { AddNotificationOutboxEventId1786370000000 } from './migrations/1786370000000-AddNotificationOutboxEventId.js'

describe('notification outbox idempotency migration', () => {
    it('adds a unique nullable event reference so repeated dispatch cannot duplicate notifications', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddNotificationOutboxEventId1786370000000().up({ query } as never)

        expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
            'ALTER TABLE "notifications" ADD COLUMN "outboxEventId" uuid',
            'CREATE UNIQUE INDEX "UQ_notifications_outbox_event" ON "notifications" ("outboxEventId")',
        ])
    })
})
