import { describe, expect, it } from 'vitest'

import { assertSupportedOutboxEventType, isSupportedOutboxEventType } from './outbox-event-registry.js'

describe('outbox event registry', () => {
    it('accepts only registered event types', () => {
        expect(isSupportedOutboxEventType('email.send')).toBe(true)
        expect(isSupportedOutboxEventType('unknown.event')).toBe(false)
        expect(isSupportedOutboxEventType(null)).toBe(false)
    })

    it('throws before persistence for unknown event types', () => {
        expect(() => assertSupportedOutboxEventType('unknown.event')).toThrow(/Unsupported/)
        expect(() => assertSupportedOutboxEventType('email.send')).not.toThrow()
    })
})
