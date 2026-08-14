import type { WebSocket } from 'ws'

type ChatEvent = {
    type: 'message.created' | 'message.read' | 'offer.updated' | 'attachment.created' | 'presence'
    requestId?: string
    threadId?: string
    payload: unknown
}

const connections = new Map<string, Set<WebSocket>>()

export function subscribeServiceChat(channelId: string, socket: WebSocket) {
    const listeners = connections.get(channelId) ?? new Set<WebSocket>()
    listeners.add(socket)
    connections.set(channelId, listeners)
    return () => {
        listeners.delete(socket)
        if (listeners.size === 0) connections.delete(channelId)
    }
}

export function broadcastServiceChat(channelId: string, event: ChatEvent) {
    const listeners = connections.get(channelId)
    if (!listeners) return
    const serialized = JSON.stringify(event)
    for (const socket of listeners) {
        if (socket.readyState === 1) socket.send(serialized)
    }
}

export function sendServiceChatEvent(socket: WebSocket, event: ChatEvent) {
    if (socket.readyState === 1) socket.send(JSON.stringify(event))
}
