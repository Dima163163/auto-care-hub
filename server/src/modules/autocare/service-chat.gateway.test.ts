import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/redis/redis.js', () => ({
    getRedisClient: vi.fn(() => { throw new Error('Redis disabled in unit test.') }),
    isRedisEnabled: vi.fn(() => false),
}))

vi.mock('../../shared/observability/logger.js', () => ({
    logError: vi.fn(),
}))

import { broadcastServiceChat, closeServiceChatGateway, subscribeServiceChat } from './service-chat.gateway.js'

type TestSocket = { readyState: number; send: ReturnType<typeof vi.fn> }

function createSocket(): TestSocket {
    return { readyState: 1, send: vi.fn() }
}

describe('AutoCare service chat gateway', () => {
    afterEach(async () => {
        await closeServiceChatGateway()
    })

    it('delivers a bounded event to listeners in the same process', () => {
        const socket = createSocket()
        const threadId = '11111111-1111-4111-8111-111111111111'
        const unsubscribe = subscribeServiceChat(threadId, socket as never)

        broadcastServiceChat(threadId, { type: 'presence', threadId, payload: { online: true } })

        expect(socket.send).toHaveBeenCalledWith(expect.stringContaining('"online":true'))
        const wire = JSON.parse(socket.send.mock.calls[0]?.[0] as string) as { eventId?: string }
        expect(wire.eventId).toMatch(/^[0-9a-f-]{36}$/)
        unsubscribe()
    })

    it('preserves a caller event id so cross-process redelivery can be deduplicated', () => {
        const socket = createSocket()
        const threadId = '33333333-3333-4333-8333-333333333333'
        subscribeServiceChat(threadId, socket as never)
        const eventId = '44444444-4444-4444-8444-444444444444'

        broadcastServiceChat(threadId, { eventId, type: 'presence', threadId, payload: { online: false } })

        expect(JSON.parse(socket.send.mock.calls[0]?.[0] as string)).toMatchObject({ eventId })
    })

    it('does not emit oversized realtime payloads', () => {
        const socket = createSocket()
        const threadId = '22222222-2222-4222-8222-222222222222'
        subscribeServiceChat(threadId, socket as never)

        broadcastServiceChat(threadId, { type: 'message.created', threadId, payload: { body: 'x'.repeat(256 * 1024) } })

        expect(socket.send).not.toHaveBeenCalled()
    })
})
