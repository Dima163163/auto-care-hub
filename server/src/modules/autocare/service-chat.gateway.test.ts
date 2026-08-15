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
        const unsubscribe = subscribeServiceChat('thread-1', socket as never)

        broadcastServiceChat('thread-1', { type: 'presence', threadId: 'thread-1', payload: { online: true } })

        expect(socket.send).toHaveBeenCalledWith(expect.stringContaining('"online":true'))
        unsubscribe()
    })

    it('does not emit oversized realtime payloads', () => {
        const socket = createSocket()
        subscribeServiceChat('thread-1', socket as never)

        broadcastServiceChat('thread-1', { type: 'message.created', payload: { body: 'x'.repeat(256 * 1024) } })

        expect(socket.send).not.toHaveBeenCalled()
    })
})
