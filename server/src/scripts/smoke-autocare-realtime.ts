import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
    broadcastServiceChat,
    closeServiceChatGateway,
    subscribeServiceChat,
    waitForServiceChatRedisBridge,
} from '../modules/autocare/service-chat.gateway.js'
import { disconnectRedis, isRedisEnabled } from '../shared/redis/redis.js'

const [, , mode, channelId = randomUUID()] = process.argv
const timeoutMs = 8_000

type SmokeSocket = {
    readyState: number
    send(payload: string): void
}

function fail(message: string): never {
    throw new Error(message)
}

async function runSubscriber() {
    if (!await waitForServiceChatRedisBridge()) {
        fail('Redis is not enabled; realtime smoke check requires REDIS_HOST or REDIS_URL.')
    }
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for a Redis chat event.')), timeoutMs)
        let received = 0
        let unsubscribe: (() => void) | undefined
        const socket: SmokeSocket = {
            readyState: 1,
            send(payload) {
                received += 1
                process.stdout.write(`EVENT:${payload}\n`)
                // The publisher intentionally emits the same event id twice.
                // Re-subscribe after the first delivery to emulate a reconnect;
                // a real browser must then deduplicate the repeated event id.
                if (received === 1) {
                    unsubscribe?.()
                    unsubscribe = subscribeServiceChat(channelId, socket as never)
                }
                if (received === 2) {
                    clearTimeout(timeout)
                    resolve()
                }
            },
        }
        unsubscribe = subscribeServiceChat(channelId, socket as never)
        process.stdout.write('READY\n')
    })
}

async function runPublisher() {
    if (!await waitForServiceChatRedisBridge()) {
        fail('Redis is not enabled; realtime smoke check requires REDIS_HOST or REDIS_URL.')
    }
    broadcastServiceChat(channelId, {
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        type: 'presence',
        threadId: channelId,
        payload: { online: true, source: 'cross-process-smoke' },
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    broadcastServiceChat(channelId, {
        eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        type: 'presence',
        threadId: channelId,
        payload: { online: true, source: 'cross-process-smoke' },
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
    await closeServiceChatGateway()
    await disconnectRedis()
}

function spawnRole(role: 'subscriber' | 'publisher', channel: string) {
    const scriptPath = fileURLToPath(import.meta.url)
    const scriptArgs = scriptPath.endsWith('.ts')
        ? ['--import', 'tsx', scriptPath, role, channel]
        : [scriptPath, role, channel]
    return spawn(process.execPath, scriptArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
    })
}

async function runCoordinator() {
    if (!isRedisEnabled()) {
        fail('Redis is not enabled; set REDIS_HOST or REDIS_URL before running this smoke check.')
    }
    const channel = randomUUID()
    const subscribers = [spawnRole('subscriber', channel), spawnRole('subscriber', channel)]
    const outputs = subscribers.map(() => '')
    let stderr = ''
    let publisherStarted = false
    const cleanup = () => {
        for (const subscriber of subscribers) {
            if (!subscriber.killed) subscriber.kill('SIGTERM')
        }
    }
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup()
            reject(new Error(`Timed out waiting for the cross-process Redis event. ${stderr}`))
        }, timeoutMs)

        const startPublisherWhenReady = () => {
            if (publisherStarted || !outputs.every((output) => output.includes('READY'))) return
            publisherStarted = true
            const publisher = spawnRole('publisher', channel)
            publisher.stderr.on('data', (error: Buffer) => { stderr += error.toString() })
            publisher.once('exit', (code) => {
                if (code === 0) return
                clearTimeout(timeout)
                cleanup()
                reject(new Error(`Publisher process failed. ${stderr}`))
            })
        }

        subscribers.forEach((subscriber, index) => {
            subscriber.stdout.on('data', (chunk: Buffer) => {
                outputs[index] += chunk.toString()
                startPublisherWhenReady()
            })
            subscriber.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
            subscriber.once('exit', (code) => {
                const output = outputs[index] ?? ''
                if (code !== 0 || !output.includes('EVENT:')) {
                    clearTimeout(timeout)
                    cleanup()
                    reject(new Error(`Subscriber process ${index + 1} failed. ${stderr}`))
                    return
                }
                if (!subscribers.some((candidate) => candidate.exitCode === null)) {
                    clearTimeout(timeout)
                    const eventPayloads = outputs.map((output) => output.split('\n').filter((line) => line.startsWith('EVENT:')).map((line) => line.slice('EVENT:'.length)))
                    const eventIds = eventPayloads.flatMap((payloads) => payloads.map((payload) => {
                        try {
                            return (JSON.parse(payload) as { eventId?: unknown }).eventId
                        } catch {
                            return null
                        }
                    }))
                    if (eventPayloads.some((payloads) => payloads.length !== 2) || !eventIds[0] || eventIds.some((eventId) => eventId !== eventIds[0])) {
                        reject(new Error(`Subscribers did not receive two identical event deliveries. ${outputs.join('\n')}`))
                        return
                    }
                    resolve()
                }
            })
        })
    })
    process.stdout.write('Cross-process Redis/WebSocket chat smoke check passed (2 subscribers, repeated event identity).\n')
}

async function main() {
    try {
        if (mode === 'subscriber') await runSubscriber()
        else if (mode === 'publisher') await runPublisher()
        else await runCoordinator()
    } finally {
        await closeServiceChatGateway()
        await disconnectRedis()
    }
}

void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Realtime smoke check failed.'}\n`)
    process.exitCode = 1
})
