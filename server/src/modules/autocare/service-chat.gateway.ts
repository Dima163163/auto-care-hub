import type { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { getRedisClient, isRedisEnabled } from '../../shared/redis/redis.js'
import { logError } from '../../shared/observability/logger.js'

type ChatEvent = {
    /** Stable id used to de-duplicate a Redis redelivery after reconnect. */
    eventId?: string
    type: 'message.created' | 'message.read' | 'offer.updated' | 'attachment.created' | 'presence'
    requestId?: string
    threadId?: string
    payload: Record<string, unknown>
}

const chatEventSchema = z.object({
    eventId: z.string().uuid().optional(),
    type: z.enum(['message.created', 'message.read', 'offer.updated', 'attachment.created', 'presence']),
    requestId: z.string().uuid().optional(),
    threadId: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()),
})

const connections = new Map<string, Set<WebSocket>>()
const REDIS_CHANNEL_PREFIX = 'autocare:chat:'
const MAX_CHAT_EVENT_BYTES = 256 * 1024
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

function serializeEvent(event: ChatEvent) {
    try {
        const parsed = chatEventSchema.safeParse(event)
        if (!parsed.success) {
            logError('AutoCare chat event failed runtime validation', new Error('Invalid chat event payload.'))
            return null
        }
        const serialized = JSON.stringify(parsed.data)
        if (Buffer.byteLength(serialized, 'utf8') > MAX_CHAT_EVENT_BYTES) {
            logError('AutoCare chat event exceeded realtime payload limit', new Error('Chat event is too large.'))
            return null
        }
        return serialized
    } catch (error) {
        logError('AutoCare chat event could not be serialized', error)
        return null
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
                    const wire = JSON.parse(serialized) as { source?: unknown; event?: unknown }
                    const event = chatEventSchema.safeParse(wire.event)
                    if (wire.source === instanceId || !event.success) return
                    broadcastLocal(channelId, JSON.stringify(event.data))
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

/**
 * Lets process-level smoke checks wait for the Redis subscription before a
 * separate process publishes an event. Normal WebSocket callers do not need
 * to await this: subscribeServiceChat starts the bridge lazily for them.
 */
export async function waitForServiceChatRedisBridge() {
    await ensureRedisBridge()
    return isRedisEnabled() ? redisSubscriber !== null : false
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
    const eventWithId: ChatEvent = { ...event, eventId: event.eventId ?? randomUUID() }
    const serialized = serializeEvent(eventWithId)
    if (!serialized) return
    broadcastLocal(channelId, serialized)
    // A message can be created immediately after the first subscription. Wait
    // for the bridge setup so the first cross-process event is not lost while
    // the Redis publisher is still being initialized.
    void ensureRedisBridge().then(() => {
        if (!redisPublisher) return
        const wire = JSON.stringify({ source: instanceId, event: eventWithId })
        return redisPublisher.publish(channelName(channelId), wire).catch((error) => {
            logError('AutoCare chat Redis publish failed', error)
        })
    })
}

export function sendServiceChatEvent(socket: WebSocket, event: ChatEvent) {
    const serialized = serializeEvent({ ...event, eventId: event.eventId ?? randomUUID() })
    if (serialized && socket.readyState === 1) socket.send(serialized)
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
