import { describe, expect, it } from 'vitest'

import { OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'
import { canDeadLetterOutboxEvent, canRetryOutboxEvent } from './outbox-state.js'

describe('outbox state guards', () => {
    it('allows retry only for non-active terminal work', () => {
        expect(canRetryOutboxEvent(OutboxEventStatus.Failed)).toBe(true)
        expect(canRetryOutboxEvent(OutboxEventStatus.DeadLetter)).toBe(true)
        expect(canRetryOutboxEvent(OutboxEventStatus.Processing)).toBe(false)
        expect(canRetryOutboxEvent(OutboxEventStatus.Completed)).toBe(false)
    })

    it('requires failed status and exhausted attempts for dead lettering', () => {
        expect(canDeadLetterOutboxEvent(OutboxEventStatus.Failed, 5, 5)).toBe(true)
        expect(canDeadLetterOutboxEvent(OutboxEventStatus.Failed, 4, 5)).toBe(false)
        expect(canDeadLetterOutboxEvent(OutboxEventStatus.Pending, 5, 5)).toBe(false)
    })
})
