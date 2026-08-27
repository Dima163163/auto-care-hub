import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

import { env } from '../config/env.js'

const eicarTestPayload = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

function encodeCopySource(bucket: string, key: string) {
    return `/${bucket}/${encodeURIComponent(key).replaceAll('%2F', '/')}`
}

async function scan(content: Buffer, expectedCode: number) {
    const exitCode = await new Promise<number>((resolve, reject) => {
        const process = spawn(env.autoCareAttachments.clamavCommand, ['--no-summary', '-'], {
            stdio: ['pipe', 'ignore', 'pipe'],
        })
        process.once('error', reject)
        process.once('close', (code) => resolve(code ?? -1))
        process.stdin.end(content)
    })
    if (exitCode !== expectedCode) throw new Error(`ClamAV preflight returned exit code ${exitCode}; expected ${expectedCode}.`)
}

async function run() {
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
        const signedUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: privateKey }), { expiresIn: env.autoCareAttachments.signedUrlTtlSeconds })
        const signedUrlParameters = new URL(signedUrl).searchParams
        const signedExpiry = Number(signedUrlParameters.get('X-Amz-Expires'))
        if (signedUrlParameters.get('X-Amz-Signature') === null || signedExpiry !== env.autoCareAttachments.signedUrlTtlSeconds) {
            throw new Error('Signed attachment URL is missing an expected signature or TTL.')
        }
        if (new URL(signedUrl).pathname.includes('/quarantine/')) {
            throw new Error('Signed attachment URL must never expose a quarantine object.')
        }
        const response = await fetch(signedUrl)
        if (!response.ok) throw new Error(`Signed attachment read returned HTTP ${response.status}.`)
        const received = Buffer.from(await response.arrayBuffer())
        if (!received.equals(cleanPayload)) throw new Error('Signed attachment read returned unexpected bytes.')
        console.log('Production media preflight passed: S3 private access, promotion, signed read and ClamAV checks.')
    } finally {
        await Promise.all([
            client.send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey })),
            client.send(new DeleteObjectCommand({ Bucket: bucket, Key: privateKey })),
        ]).catch(() => undefined)
    }
}

run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Production media preflight failed.')
    process.exitCode = 1
})
