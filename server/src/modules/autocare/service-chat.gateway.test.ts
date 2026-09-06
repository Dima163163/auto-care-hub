import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/redis/redis.js', () => ({
    getRedisClient: vi.fn(() => { throw new Error('Redis disabled in unit test.') }),
    isRedisEnabled: vi.fn(() => false),
}))

vi.mock('../../shared/observability/logger.js', () => ({
    logError: vi.fn(),
}))

import { broadcastServiceChat, closeServiceChatGateway, subscribeServiceChat } from './service-chat.gateway.js'

type TestSocket = { readyState: number; send: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }

function createSocket(): TestSocket {
    return { readyState: 1, send: vi.fn(), close: vi.fn() }
}

describe('AutoCare service chat gateway', () => {
    afterEach(async () => {
        vi.useRealTimers()
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

    it('fails closed when a live access check is revoked before delivery', async () => {
        const socket = createSocket()
        const threadId = '55555555-5555-4555-8555-555555555555'
        let allowed = true
        subscribeServiceChat(threadId, socket as never, { authorize: () => allowed })

        allowed = false
        broadcastServiceChat(threadId, { type: 'message.created', threadId, payload: { body: 'private' } })

        await vi.waitFor(() => expect(socket.close).toHaveBeenCalledWith(4403, 'Chat access revoked'))
        expect(socket.send).not.toHaveBeenCalled()
    })

    it('fails closed when live access revalidation throws', async () => {
        const socket = createSocket()
        const threadId = '66666666-6666-4666-8666-666666666666'
        subscribeServiceChat(threadId, socket as never, { authorize: () => { throw new Error('database unavailable') } })

        broadcastServiceChat(threadId, { type: 'message.created', threadId, payload: { body: 'private' } })

        await vi.waitFor(() => expect(socket.close).toHaveBeenCalledWith(4403, 'Chat access revoked'))
        expect(socket.send).not.toHaveBeenCalled()
    })

    it.each([
        ['provider suspension', 'provider-suspended'],
        ['account deletion', 'account-deleted'],
        ['JWT/session expiry', 'session-expired'],
    ])('closes a private socket after heartbeat access recheck detects %s', async (_label, state) => {
        vi.useFakeTimers()
        const socket = createSocket()
        const threadId = '77777777-7777-4777-8777-777777777777'
        let accessState = 'active'

        subscribeServiceChat(threadId, socket as never, {
            authorize: () => accessState === 'active',
        })

        accessState = state
        await vi.advanceTimersByTimeAsync(30_000)

        expect(socket.close).toHaveBeenCalledWith(4403, 'Chat access revoked')
        expect(socket.send).not.toHaveBeenCalled()
    })
})
