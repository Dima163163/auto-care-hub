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
}

export type ServiceChatEvent = {
    type: 'message.created' | 'message.read' | 'offer.updated' | 'attachment.created' | 'presence'
    requestId?: string
    threadId?: string
    payload: unknown
}

type Listener = (event: ServiceChatEvent) => void
const mockListeners = new Map<string, Set<Listener>>()

export function emitMockServiceChatEvent(event: ServiceChatEvent) {
    const channelId = event.requestId ?? event.threadId
    if (channelId) mockListeners.get(channelId)?.forEach((listener) => listener(event))
}

export function connectServiceChat(requestId: string, listener: Listener) {
    if (IS_MOCK_API) {
        const listeners = mockListeners.get(requestId) ?? new Set<Listener>()
        listeners.add(listener)
        mockListeners.set(requestId, listeners)
        return () => {
            listeners.delete(listener)
            if (listeners.size === 0) mockListeners.delete(requestId)
        }
    }

    const token = getAccessToken()
    if (!token || typeof window === 'undefined') return () => undefined
    const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin + API_BASE_URL
    const url = new URL(`${base}/v1/service-requests/${requestId}/ws`)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('accessToken', token)
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let stopped = false
    const connect = () => {
        if (stopped) return
        socket = new WebSocket(url)
        socket.addEventListener('message', (message) => {
            try { listener(JSON.parse(String(message.data)) as ServiceChatEvent) } catch { /* ignore malformed server events */ }
        })
        socket.addEventListener('close', () => {
            socket = null
            if (!stopped) reconnectTimer = window.setTimeout(connect, 2_000)
        })
    }
    connect()
    return () => {
        stopped = true
        if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
        socket?.close()
        socket = null
    }
}

export function emitMockAutoCareChatEvent(event: ServiceChatEvent) {
    const channelId = event.threadId ?? event.requestId
    if (channelId) mockListeners.get(channelId)?.forEach((listener) => listener(event))
}

export function connectAutoCareChat(chatId: string, listener: Listener) {
    if (IS_MOCK_API) {
        const listeners = mockListeners.get(chatId) ?? new Set<Listener>()
        listeners.add(listener)
        mockListeners.set(chatId, listeners)
        return () => {
            listeners.delete(listener)
            if (listeners.size === 0) mockListeners.delete(chatId)
        }
    }
    const token = getAccessToken()
    if (!token || typeof window === 'undefined') return () => undefined
    const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin + API_BASE_URL
    const url = new URL(`${base}/v1/chats/${chatId}/ws`)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('accessToken', token)
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let stopped = false
    const connect = () => {
        if (stopped) return
        socket = new WebSocket(url)
        socket.addEventListener('message', (message) => {
            try { listener(JSON.parse(String(message.data)) as ServiceChatEvent) } catch { /* ignore malformed server events */ }
        })
        socket.addEventListener('close', () => {
            socket = null
            if (!stopped) reconnectTimer = window.setTimeout(connect, 2_000)
        })
    }
    connect()
    return () => {
        stopped = true
        if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
        socket?.close()
        socket = null
    }
}
