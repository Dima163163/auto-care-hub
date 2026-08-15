import type { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'

import { getRedisClient, isRedisEnabled } from '../../shared/redis/redis.js'
import { logError } from '../../shared/observability/logger.js'

type ChatEvent = {
    type: 'message.created' | 'message.read' | 'offer.updated' | 'attachment.created' | 'presence'
    requestId?: string
    threadId?: string
    payload: unknown
}

const connections = new Map<string, Set<WebSocket>>()
const REDIS_CHANNEL_PREFIX = 'autocare:chat:'
const instanceId = randomUUID()
let redisPublisher: ReturnType<typeof getRedisClient> | null = null
let redisSubscriber: ReturnType<typeof getRedisClient> | null = null
let redisBridgePromise: Promise<void> | null = null

function channelName(channelId: string) {
    return `${REDIS_CHANNEL_PREFIX}${channelId}`
}

function broadcastLocal(channelId: string, serialized: string) {
    const listeners = connections.get(channelId)
    if (!listeners) return
    for (const socket of listeners) {
        if (socket.readyState === 1) socket.send(serialized)
    }
}

async function ensureRedisBridge() {
    if (!isRedisEnabled()) return
    if (redisBridgePromise) return redisBridgePromise

    redisBridgePromise = (async () => {
        try {
            const client = getRedisClient()
            redisPublisher = client
            redisSubscriber = client.duplicate()
            redisSubscriber.on('pmessage', (_pattern, channel, serialized) => {
                if (!channel.startsWith(REDIS_CHANNEL_PREFIX)) return
                const channelId = channel.slice(REDIS_CHANNEL_PREFIX.length)
                try {
                    const wire = JSON.parse(serialized) as { source?: unknown; event?: ChatEvent }
                    if (wire.source === instanceId || !wire.event) return
                    broadcastLocal(channelId, JSON.stringify(wire.event))
                } catch {
                    // Ignore malformed cross-process events instead of sending
                    // untrusted data to every connected browser.
                }
            })
            await redisSubscriber.psubscribe(`${REDIS_CHANNEL_PREFIX}*`)
        } catch (error) {
            redisPublisher = null
            redisSubscriber?.disconnect()
            redisSubscriber = null
            redisBridgePromise = null
            logError('AutoCare chat Redis bridge unavailable; using local delivery', error)
        }
    })()

    return redisBridgePromise
}

export function subscribeServiceChat(channelId: string, socket: WebSocket) {
    void ensureRedisBridge()
    const listeners = connections.get(channelId) ?? new Set<WebSocket>()
    listeners.add(socket)
    connections.set(channelId, listeners)
    return () => {
        listeners.delete(socket)
        if (listeners.size === 0) connections.delete(channelId)
    }
}

export function broadcastServiceChat(channelId: string, event: ChatEvent) {
    const serialized = JSON.stringify(event)
    broadcastLocal(channelId, serialized)
    if (redisPublisher) {
        const wire = JSON.stringify({ source: instanceId, event })
        void redisPublisher.publish(channelName(channelId), wire).catch((error) => {
            logError('AutoCare chat Redis publish failed', error)
        })
    }
}

export function sendServiceChatEvent(socket: WebSocket, event: ChatEvent) {
    if (socket.readyState === 1) socket.send(JSON.stringify(event))
}

export async function closeServiceChatGateway() {
    connections.clear()
    if (redisSubscriber) {
        await redisSubscriber.quit().catch(() => redisSubscriber?.disconnect())
    }
    redisPublisher = null
    redisSubscriber = null
    redisBridgePromise = null
}
