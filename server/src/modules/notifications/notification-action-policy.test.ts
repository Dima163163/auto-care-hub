import { describe, expect, it } from 'vitest'

import { getNotificationMarkAllBatchSize, MAX_NOTIFICATION_MARK_ALL_BATCH, normalizeNotificationUuid } from './notification-action-policy.js'

describe('notification action policy', () => {
    it('keeps mark-all updates bounded', () => {
        expect(getNotificationMarkAllBatchSize()).toBe(MAX_NOTIFICATION_MARK_ALL_BATCH)
        expect(getNotificationMarkAllBatchSize()).toBe(500)
    })

    it('canonicalizes notification UUIDs and fails closed for malformed values', () => {
        expect(normalizeNotificationUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeNotificationUuid('not-a-uuid')).toBeNull()
        expect(normalizeNotificationUuid(null)).toBeNull()
    })
})
