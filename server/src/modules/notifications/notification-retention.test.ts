import { describe, expect, it } from 'vitest'

import {
    getNotificationRetentionCutoff,
    isNotificationOlderThan,
} from './notification-retention.js'

describe('notification retention', () => {
    it('selects notifications older than the configured cutoff', () => {
        const now = new Date('2026-07-29T00:00:00.000Z')
        const cutoff = getNotificationRetentionCutoff(now, 30)

        expect(cutoff.toISOString()).toBe('2026-06-29T00:00:00.000Z')
        expect(isNotificationOlderThan(new Date('2026-06-28T23:59:59.000Z'), cutoff)).toBe(true)
        expect(isNotificationOlderThan(cutoff, cutoff)).toBe(false)
    })

    it('bounds retention settings', () => {
        expect(() => getNotificationRetentionCutoff(new Date(), 0)).toThrow()
        expect(() => getNotificationRetentionCutoff(new Date(), 731)).toThrow()
    })
})
