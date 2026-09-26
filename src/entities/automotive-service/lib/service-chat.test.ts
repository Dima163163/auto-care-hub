import { afterEach, describe, expect, it, vi } from 'vitest'

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

    it('exposes connection lifecycle as presence events', () => {
        const events: Array<{ type: string; payload: Record<string, unknown> }> = []
        const disconnect = connectServiceChat('request-presence', (event) => {
            events.push({ type: event.type, payload: event.payload })
        })

        expect(events.at(-1)).toEqual({ type: 'presence', payload: { connected: true } })
        disconnect()
        expect(events.at(-1)).toEqual({ type: 'presence', payload: { connected: false } })
    })
})

describe('service chat reconnect authentication', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.doUnmock('@/shared/config/api')
        vi.doUnmock('@/shared/lib/auth-token')
        vi.resetModules()
    })

    it('reads a fresh token on each reconnect and stops on backend denial codes', async () => {
        vi.useFakeTimers()
        vi.stubEnv('VITE_API_MODE', 'real')
        vi.spyOn(Math, 'random').mockReturnValue(0)
        vi.resetModules()
        const getAccessToken = vi.fn((): string => 'token-one')
        vi.doMock('@/shared/config/api', () => ({ API_BASE_URL: '/api', IS_MOCK_API: false }))
        vi.doMock('@/shared/lib/auth-token', () => ({ getAccessToken }))
        class MockWebSocket extends EventTarget {
            static instances: MockWebSocket[] = []
            readonly readyState = 1
            readonly url: string | URL
            readonly protocols?: string | string[]
            constructor(url: string | URL, protocols?: string | string[]) {
                super()
                this.url = url
                this.protocols = protocols
                MockWebSocket.instances.push(this)
            }
            close(code = 1000) {
                this.dispatchEvent(new CloseEvent('close', { code }))
            }
        }
        vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
        const { connectServiceChat } = await import('./service-chat')
        const disconnect = connectServiceChat('request-1', () => undefined)
        expect(MockWebSocket.instances[0]?.protocols).toEqual(['bearer.token-one'])

        getAccessToken.mockReturnValue('token-two')
        MockWebSocket.instances[0]?.close(1006)
        await vi.advanceTimersByTimeAsync(1_000)
        expect(MockWebSocket.instances[1]?.protocols).toEqual(['bearer.token-two'])

        MockWebSocket.instances[1]?.close(4401)
        await vi.advanceTimersByTimeAsync(2_000)
        expect(MockWebSocket.instances[2]?.protocols).toEqual(['bearer.token-two'])

        MockWebSocket.instances[2]?.close(4403)
        await vi.advanceTimersByTimeAsync(60_000)
        expect(MockWebSocket.instances).toHaveLength(3)
        disconnect()
    })

    it('stops after the configured reconnect attempt limit', async () => {
        vi.useFakeTimers()
        vi.stubEnv('VITE_API_MODE', 'real')
        vi.spyOn(Math, 'random').mockReturnValue(0)
        vi.resetModules()
        vi.doMock('@/shared/config/api', () => ({ API_BASE_URL: '/api', IS_MOCK_API: false }))
        vi.doMock('@/shared/lib/auth-token', () => ({ getAccessToken: () => 'active-token' }))
        class MockWebSocket extends EventTarget {
            static instances: MockWebSocket[] = []
            readonly readyState = 1
            readonly url: string | URL
            readonly protocols?: string | string[]
            constructor(url: string | URL, protocols?: string | string[]) {
                super()
                this.url = url
                this.protocols = protocols
                MockWebSocket.instances.push(this)
            }
            close(code = 1000) {
                this.dispatchEvent(new CloseEvent('close', { code }))
            }
        }
        vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
        const { connectServiceChat } = await import('./service-chat')
        const disconnect = connectServiceChat('request-bounded', () => undefined)

        for (let attempt = 0; attempt < 8; attempt += 1) {
            MockWebSocket.instances.at(-1)?.close(1006)
            await vi.advanceTimersByTimeAsync(60_000)
        }
        expect(MockWebSocket.instances).toHaveLength(9)
        MockWebSocket.instances.at(-1)?.close(1006)
        await vi.advanceTimersByTimeAsync(60_000)
        expect(MockWebSocket.instances).toHaveLength(9)
        disconnect()
    })
})
