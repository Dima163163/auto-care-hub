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
        const socket: SmokeSocket = {
            readyState: 1,
            send(payload) {
                clearTimeout(timeout)
                process.stdout.write(`EVENT:${payload}\n`)
                resolve()
            },
        }
        subscribeServiceChat(channelId, socket as never)
        process.stdout.write('READY\n')
    })
}

async function runPublisher() {
    if (!await waitForServiceChatRedisBridge()) {
        fail('Redis is not enabled; realtime smoke check requires REDIS_HOST or REDIS_URL.')
    }
    broadcastServiceChat(channelId, {
        type: 'presence',
        threadId: channelId,
        payload: { online: true, source: 'cross-process-smoke' },
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    await closeServiceChatGateway()
    await disconnectRedis()
}

function spawnRole(role: 'subscriber' | 'publisher', channel: string) {
    const scriptPath = fileURLToPath(import.meta.url)
    return spawn(process.execPath, ['--import', 'tsx', scriptPath, role, channel], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
    })
}

async function runCoordinator() {
    if (!isRedisEnabled()) {
        fail('Redis is not enabled; set REDIS_HOST or REDIS_URL before running this smoke check.')
    }
    const channel = randomUUID()
    const subscriber = spawnRole('subscriber', channel)
    let stdout = ''
    let stderr = ''
    let publisherStarted = false
    const cleanup = () => {
        if (!subscriber.killed) subscriber.kill('SIGTERM')
    }
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup()
            reject(new Error(`Timed out waiting for the cross-process Redis event. ${stderr}`))
        }, timeoutMs)

        subscriber.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString()
            if (!stdout.includes('READY') || publisherStarted) return
            publisherStarted = true
            const publisher = spawnRole('publisher', channel)
            publisher.stderr.on('data', (error: Buffer) => { stderr += error.toString() })
            publisher.once('exit', (code) => {
                if (code === 0) return
                clearTimeout(timeout)
                cleanup()
                reject(new Error(`Publisher process failed. ${stderr}`))
            })
        })
        subscriber.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
        subscriber.once('exit', (code) => {
            clearTimeout(timeout)
            if (code !== 0 || !stdout.includes('EVENT:')) {
                reject(new Error(`Subscriber process failed. ${stderr}`))
                return
            }
            resolve()
        })
    })
    process.stdout.write('Cross-process Redis/WebSocket chat smoke check passed.\n')
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
