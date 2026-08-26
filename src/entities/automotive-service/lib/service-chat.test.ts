import { describe, expect, it } from 'vitest'

import { connectServiceChat, createServiceChatEventDeduper, emitMockServiceChatEvent } from './service-chat'

describe('service chat event deduplication', () => {
    it('drops a repeated event id while allowing a new event through', () => {
        const remember = createServiceChatEventDeduper()

        expect(remember('event-1')).toBe(true)
        expect(remember('event-1')).toBe(false)
        expect(remember('event-2')).toBe(true)
    })

    it('evicts the oldest id after reaching the bounded history', () => {
        const remember = createServiceChatEventDeduper(2)

        expect(remember('event-1')).toBe(true)
        expect(remember('event-2')).toBe(true)
        expect(remember('event-3')).toBe(true)
        expect(remember('event-2')).toBe(false)
        expect(remember('event-1')).toBe(true)
    })

    it('deduplicates repeated events in mock mode as well as websocket mode', () => {
        const events: string[] = []
        const disconnect = connectServiceChat('request-dedup', (event) => {
            if (event.eventId) events.push(event.eventId)
        })
        const repeated = {
            eventId: '55555555-5555-4555-8555-555555555555',
            type: 'message.created' as const,
            requestId: 'request-dedup',
            payload: { id: 'message-1' },
        }
        emitMockServiceChatEvent(repeated)
        emitMockServiceChatEvent(repeated)
        disconnect()

        expect(events).toEqual([repeated.eventId])
    })
})
