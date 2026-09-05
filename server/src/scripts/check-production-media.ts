import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { env } from '../config/env.js'

const eicarTestPayload = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
export const MAX_MEDIA_PREFLIGHT_RESPONSE_BYTES = 10 * 1024 * 1024

export function validateSignedAttachmentUrl(signedUrl: string, expectedTtlSeconds: number, options: { requirePrivateCacheControl?: boolean } = {}) {
    let parsed
    try {
        parsed = new URL(signedUrl)
    } catch {
        throw new Error('Signed attachment URL is not a valid absolute URL.')
    }

    const signature = parsed.searchParams.get('X-Amz-Signature')
    const signedExpiry = Number(parsed.searchParams.get('X-Amz-Expires'))
    if (!signature || !Number.isInteger(expectedTtlSeconds) || expectedTtlSeconds < 1 || signedExpiry !== expectedTtlSeconds) {
        throw new Error('Signed attachment URL is missing an expected signature or TTL.')
    }
    if (parsed.pathname.split('/').includes('quarantine')) {
        throw new Error('Signed attachment URL must never expose a quarantine object.')
    }
    if (!parsed.pathname.split('/').includes('private')) {
        throw new Error('Signed attachment URL must target a private object.')
    }
    if (options.requirePrivateCacheControl && parsed.searchParams.get('response-cache-control') !== 'private, no-store') {
        throw new Error('Signed attachment URL must disable shared caching.')
    }
    return parsed
}

export function validatePrivateObjectHead(metadata: {
    ContentType?: string
    ContentDisposition?: string
    Metadata?: Record<string, string>
    ServerSideEncryption?: string
}) {
    if (metadata.ServerSideEncryption !== 'AES256') {
        throw new Error('Promoted private attachment is not encrypted with AES256.')
    }
    const state = Object.entries(metadata.Metadata ?? {})
        .find(([key]) => key.toLowerCase() === 'state')?.[1]
    if (state !== 'private') throw new Error('Promoted attachment is missing private state metadata.')
    const checksum = Object.entries(metadata.Metadata ?? {})
        .find(([key]) => key.toLowerCase() === 'sha256')?.[1]
    if (!checksum || !/^[a-f0-9]{64}$/i.test(checksum)) throw new Error('Promoted attachment is missing checksum metadata.')
    if (metadata.ContentType !== 'application/octet-stream') {
        throw new Error('Promoted private attachment has an unexpected content type.')
    }
    if (metadata.ContentDisposition?.toLowerCase() !== 'inline') throw new Error('Promoted private attachment must use inline disposition.')
}

export async function readBoundedMediaResponse(response: Response, maxBytes = MAX_MEDIA_PREFLIGHT_RESPONSE_BYTES) {
    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error(`Signed attachment response exceeds the ${maxBytes}-byte limit.`)
    if (!response.body) return Buffer.alloc(0)
    const reader = response.body.getReader()
    const chunks: Buffer[] = []
    let total = 0
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = Buffer.from(value)
            total += chunk.length
            if (total > maxBytes) {
                await reader.cancel()
                throw new Error(`Signed attachment response exceeds the ${maxBytes}-byte limit.`)
            }
            chunks.push(chunk)
        }
    } finally {
        reader.releaseLock()
    }
    return Buffer.concat(chunks, total)
}

function encodeCopySource(bucket: string, key: string) {
    return `/${bucket}/${encodeURIComponent(key).replaceAll('%2F', '/')}`
}

async function scan(content: Buffer, expectedCode: number) {
    const exitCode = await new Promise<number>((resolve, reject) => {
        const scanner = spawn(env.autoCareAttachments.clamavCommand, ['--no-summary', '-'], {
            stdio: ['pipe', 'ignore', 'pipe'],
        })
        let settled = false
        const finish = (callback: () => void) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            callback()
        }
        const timeout = setTimeout(() => {
            scanner.kill('SIGKILL')
            finish(() => reject(new Error(`ClamAV preflight timed out after ${env.autoCareAttachments.scanTimeoutMs} ms.`)))
        }, env.autoCareAttachments.scanTimeoutMs)
        timeout.unref()
        scanner.once('error', (error) => finish(() => reject(error)))
        scanner.once('close', (code) => finish(() => resolve(code ?? -1)))
        scanner.stdin.end(content)
    })
    if (exitCode !== expectedCode) throw new Error(`ClamAV preflight returned exit code ${exitCode}; expected ${expectedCode}.`)
}

export async function runProductionMediaPreflight() {
    if (env.autoCareAttachments.storageProvider !== 's3' || env.autoCareAttachments.antivirusMode !== 'clamav') {
        throw new Error('Production media preflight requires S3 storage and ClamAV mode.')
    }
    const { bucket, accessKeyId, secretAccessKey, endpoint, region, forcePathStyle } = env.autoCareAttachments.s3
    if (!bucket || !accessKeyId || !secretAccessKey) throw new Error('S3 credentials are not configured.')

    const client = new S3Client({ endpoint: endpoint ?? undefined, region, forcePathStyle, credentials: { accessKeyId, secretAccessKey } })
    const objectId = randomUUID()
    const baseKey = `autocare-preflight/${objectId}`
    const quarantineKey = `quarantine/${baseKey}`
    const privateKey = `private/${baseKey}`
    const cleanPayload = Buffer.from('AutoCare Hub production media preflight')

    try {
        await scan(cleanPayload, 0)
        await scan(Buffer.from(eicarTestPayload), 1)
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: quarantineKey, Body: cleanPayload, ContentType: 'application/octet-stream', ServerSideEncryption: 'AES256' }))
        await client.send(new CopyObjectCommand({ Bucket: bucket, Key: privateKey, CopySource: encodeCopySource(bucket, quarantineKey), MetadataDirective: 'REPLACE', ContentType: 'application/octet-stream', ServerSideEncryption: 'AES256' }))
        const privateHead = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: privateKey }))
        validatePrivateObjectHead(privateHead)
        const signedUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: privateKey }), { expiresIn: env.autoCareAttachments.signedUrlTtlSeconds })
        validateSignedAttachmentUrl(signedUrl, env.autoCareAttachments.signedUrlTtlSeconds, { requirePrivateCacheControl: true })
        const response = await fetch(signedUrl)
        if (!response.ok) throw new Error(`Signed attachment read returned HTTP ${response.status}.`)
        const received = await readBoundedMediaResponse(response)
        if (!received.equals(cleanPayload)) throw new Error('Signed attachment read returned unexpected bytes.')
        return { status: 'pass', storage: 's3-private', antivirus: 'clamav', signedUrlTtlSeconds: env.autoCareAttachments.signedUrlTtlSeconds, bytes: received.length }
    } finally {
        await Promise.all([
            client.send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey })),
            client.send(new DeleteObjectCommand({ Bucket: bucket, Key: privateKey })),
        ]).catch(() => undefined)
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runProductionMediaPreflight().then((report) => {
        if (process.argv.includes('--json')) console.log(JSON.stringify(report))
        else console.log('Production media preflight passed: S3 private access, promotion, signed read and ClamAV checks.')
    }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Production media preflight failed.'
        if (process.argv.includes('--json')) console.error(JSON.stringify({ status: 'blocked', message }))
        else console.error(message)
        process.exitCode = 1
    })
}
