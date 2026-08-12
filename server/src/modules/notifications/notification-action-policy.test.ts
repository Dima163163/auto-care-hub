import { describe, expect, it } from 'vitest'

import { getNotificationMarkAllBatchSize, MAX_NOTIFICATION_MARK_ALL_BATCH } from './notification-action-policy.js'

describe('notification action policy', () => {
    it('keeps mark-all updates bounded', () => {
        expect(getNotificationMarkAllBatchSize()).toBe(MAX_NOTIFICATION_MARK_ALL_BATCH)
        expect(getNotificationMarkAllBatchSize()).toBe(500)
    })
})
