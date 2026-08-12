import { describe, expect, it } from 'vitest'

import {
    MAX_OUTBOX_DELAY_MS,
    MAX_OUTBOX_PAST_MS,
    assertOutboxAvailableAt,
} from './outbox-schedule-policy.js'

describe('outbox schedule policy', () => {
    it('uses a stable now value and accepts bounded schedules', () => {
        const now = Date.parse('2026-07-29T12:00:00.000Z')
        expect(assertOutboxAvailableAt(undefined, now).getTime()).toBe(now)
        expect(assertOutboxAvailableAt(new Date(now + MAX_OUTBOX_DELAY_MS), now).getTime()).toBe(now + MAX_OUTBOX_DELAY_MS)
    })

    it('rejects stale, distant, and invalid schedules', () => {
        const now = Date.parse('2026-07-29T12:00:00.000Z')
        expect(() => assertOutboxAvailableAt(new Date(now - MAX_OUTBOX_PAST_MS - 1), now)).toThrow(/bounds/)
        expect(() => assertOutboxAvailableAt(new Date(now + MAX_OUTBOX_DELAY_MS + 1), now)).toThrow(/bounds/)
        expect(() => assertOutboxAvailableAt(new Date('invalid'), now)).toThrow(/bounds/)
    })
})
