import type { WebSocket } from 'ws'

type ChatEvent = {
    type: 'message.created' | 'message.read' | 'offer.updated' | 'attachment.created' | 'presence'
    requestId: string
    payload: unknown
}

const connections = new Map<string, Set<WebSocket>>()

export function subscribeServiceChat(requestId: string, socket: WebSocket) {
    const listeners = connections.get(requestId) ?? new Set<WebSocket>()
    listeners.add(socket)
    connections.set(requestId, listeners)
    return () => {
        listeners.delete(socket)
        if (listeners.size === 0) connections.delete(requestId)
    }
}

export function broadcastServiceChat(requestId: string, event: ChatEvent) {
    const listeners = connections.get(requestId)
    if (!listeners) return
    const serialized = JSON.stringify(event)
    for (const socket of listeners) {
        if (socket.readyState === 1) socket.send(serialized)
    }
}

export function sendServiceChatEvent(socket: WebSocket, event: ChatEvent) {
    if (socket.readyState === 1) socket.send(JSON.stringify(event))
}
