import { z } from 'zod'

import { API_BASE_URL, IS_MOCK_API } from '@/shared/config/api'
import { getAccessToken } from '@/shared/lib/auth-token'

export type ServiceChatMessage = {
    id: string
    senderId: string
    kind: 'text' | 'system' | 'offer'
    body: string | null
    offer: {
        type: 'discount' | 'alternative'
        title: string
        description: string | null
        discountPercent: number | null
        couponCode: string | null
        amountMinor: number | null
        currencyCode: string | null
        expiresAt: string | null
        status: 'pending' | 'accepted' | 'declined'
    } | null
    deliveredAt: string | null
    readAt: string | null
    createdAt: string
    idempotencyKey?: string | null
    idempotencyFingerprint?: string | null
}

const serviceChatEventSchema = z.object({
    eventId: z.string().uuid().optional(),
    type: z.enum(['message.created', 'message.read', 'offer.updated', 'attachment.created', 'presence']),
    requestId: z.string().optional(),
    threadId: z.string().optional(),
    payload: z.record(z.string(), z.unknown()),
})

export type ServiceChatEvent = z.infer<typeof serviceChatEventSchema>
type Listener = (event: ServiceChatEvent) => void
const mockListeners = new Map<string, Set<Listener>>()
let mockEventSequence = 0
const reconnectDelays = [1_000, 2_000, 5_000, 15_000, 30_000]
const MAX_RECONNECT_ATTEMPTS = 8

/**
 * Keeps a bounded event-id history so reconnects and Redis redeliveries do not
 * append the same message twice to an open conversation.
 */
export function createServiceChatEventDeduper(maxEvents = 512) {
    const seenEventIds = new Set<string>()
    return (eventId: string) => {
        if (seenEventIds.has(eventId)) return false
        seenEventIds.add(eventId)
        if (seenEventIds.size > maxEvents) {
            const oldest = seenEventIds.values().next().value
            if (oldest) seenEventIds.delete(oldest)
        }
        return true
    }
}

export function emitMockServiceChatEvent(event: ServiceChatEvent) {
    const eventWithId = event.eventId
        ? event
        : { ...event, eventId: `mock-${Date.now()}-${++mockEventSequence}` }
    const channelId = event.requestId ?? event.threadId
    if (channelId) mockListeners.get(channelId)?.forEach((listener) => listener(eventWithId))
}

export function emitMockAutoCareChatEvent(event: ServiceChatEvent) {
    emitMockServiceChatEvent(event)
}

function connectMockChannel(channelId: string, listener: Listener) {
    const listeners = mockListeners.get(channelId) ?? new Set<Listener>()
    listeners.add(listener)
    mockListeners.set(channelId, listeners)
    return () => {
        listeners.delete(listener)
        if (listeners.size === 0) mockListeners.delete(channelId)
    }
}

function connectChatSocket(channelId: string, path: string, listener: Listener) {
    const rememberEvent = createServiceChatEventDeduper()
    const handleEvent = (event: ServiceChatEvent) => {
        if (!event.eventId || rememberEvent(event.eventId)) listener(event)
    }
    if (IS_MOCK_API) return connectMockChannel(channelId, handleEvent)

    const token = getAccessToken()
    if (!token || typeof window === 'undefined') return () => undefined

    const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin + API_BASE_URL
    const url = new URL(`${base}${path}`)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let attempt = 0
    let stopped = false
    const clearReconnect = () => {
        if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
        reconnectTimer = undefined
    }

    const scheduleReconnect = () => {
        if (stopped || !navigator.onLine || document.visibilityState === 'hidden' || attempt >= MAX_RECONNECT_ATTEMPTS) return
        clearReconnect()
        const delay = reconnectDelays[Math.min(attempt, reconnectDelays.length - 1)]!
        attempt += 1
        reconnectTimer = window.setTimeout(connect, delay + Math.round(Math.random() * 250))
    }

    const connect = () => {
        if (stopped || !navigator.onLine || document.visibilityState === 'hidden') return
        socket = new WebSocket(url, [`bearer.${token}`])
        socket.addEventListener('open', () => { attempt = 0 })
        socket.addEventListener('message', (message) => {
            try {
                const parsed: unknown = JSON.parse(String(message.data))
                const result = serviceChatEventSchema.safeParse(parsed)
                if (result.success) handleEvent(result.data)
                else console.warn('Ignored invalid AutoCare chat event')
            } catch {
                console.warn('Ignored malformed AutoCare chat event')
            }
        })
        socket.addEventListener('close', (event) => {
            socket = null
            if (event.code !== 4001 && event.code !== 4003) scheduleReconnect()
        })
    }

    const resume = () => {
        if (!socket && document.visibilityState === 'visible' && navigator.onLine) connect()
    }
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    connect()

    return () => {
        stopped = true
        clearReconnect()
        window.removeEventListener('online', resume)
        document.removeEventListener('visibilitychange', resume)
        socket?.close()
        socket = null
    }
}

export function connectServiceChat(requestId: string, listener: Listener) {
    return connectChatSocket(requestId, `/v1/service-requests/${requestId}/ws`, listener)
}

export function connectAutoCareChat(chatId: string, listener: Listener) {
    return connectChatSocket(chatId, `/v1/chats/${chatId}/ws`, listener)
}
