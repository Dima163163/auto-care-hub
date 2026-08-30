import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '../../config/env.js'
import { AppDataSource } from '../../database/data-source.js'
import { ServiceAttachmentEntity } from '../../entities/automotive/service-request.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

type AutoCareAttachmentScope = 'requests' | 'chats'

const attachmentKeyPattern = /^autocare-(requests|chats)\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.bin$/i
const attachmentRoot = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'attachments')
export const MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES = 10 * 1024 * 1024
let s3Client: S3Client | null = null

function attachmentNotFound(): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Attachment not found.' })
}

function attachmentStorageUnavailable(message: string): never {
    throw new AppError({ statusCode: 503, code: ERROR_CODES.InternalServerError, message })
}

function getS3Client() {
    const config = env.autoCareAttachments.s3
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
        attachmentStorageUnavailable('Private attachment storage is not configured.')
    }
    s3Client ??= new S3Client({
        endpoint: config.endpoint ?? undefined,
        region: config.region,
        forcePathStyle: config.forcePathStyle,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    })
    return { client: s3Client, bucket: config.bucket }
}

function getPrivateObjectKey(key: string) {
    return `private/${key}`
}

function getQuarantineObjectKey(key: string) {
    return `quarantine/${key}`
}

function encodeCopySource(bucket: string, key: string) {
    return `/${bucket}/${encodeURIComponent(key).replaceAll('%2F', '/')}`
}

export function createAutoCareAttachmentObjectKey(scope: AutoCareAttachmentScope, parentId: string, objectId: string) {
    const key = `autocare-${scope}/${parentId}/${objectId}.bin`
    assertSafeAutoCareAttachmentObjectKey(key)
    return key
}

export function assertSafeAutoCareAttachmentObjectKey(key: string) {
    if (!attachmentKeyPattern.test(key)) {
        throw new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message: 'Invalid attachment object key.' })
    }
}

export function getAutoCareAttachmentObjectPath(key: string) {
    assertSafeAutoCareAttachmentObjectKey(key)
    return path.join(attachmentRoot, key)
}

async function assertFilesystemDirectory(directoryPath: string) {
    try {
        const entry = await lstat(directoryPath)
        if (!entry.isDirectory()) attachmentNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') attachmentNotFound()
        throw error
    }
}

async function assertFilesystemAttachmentParent(key: string) {
    const [scope, parent] = key.split('/')
    if (!scope || !parent) attachmentNotFound()
    await assertFilesystemDirectory(attachmentRoot)
    await assertFilesystemDirectory(path.join(attachmentRoot, scope))
    await assertFilesystemDirectory(path.join(attachmentRoot, scope, parent))
}

async function assertReadableFilesystemAttachment(key: string) {
    await assertFilesystemAttachmentParent(key)
    const objectPath = getAutoCareAttachmentObjectPath(key)
    try {
        const entry = await lstat(objectPath)
        if (!entry.isFile() || entry.size > MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES) attachmentNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') attachmentNotFound()
        throw error
    }
}

async function scanAutoCareAttachment(content: Buffer) {
    if (env.autoCareAttachments.antivirusMode === 'disabled') return

    await new Promise<void>((resolve, reject) => {
        let settled = false
        const scanner = spawn(env.autoCareAttachments.clamavCommand, ['--no-summary', '-'], {
            stdio: ['pipe', 'ignore', 'pipe'],
        })
        let stderr = ''
        const finish = (callback: () => void) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            callback()
        }
        const timeout = setTimeout(() => {
            scanner.kill('SIGKILL')
            finish(() => reject(new AppError({
                statusCode: 503,
                code: ERROR_CODES.InternalServerError,
                message: 'Attachment malware scanner timed out.',
            })))
        }, env.autoCareAttachments.scanTimeoutMs)
        timeout.unref()
        scanner.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
        scanner.once('error', () => finish(() => reject(new AppError({
            statusCode: 503,
            code: ERROR_CODES.InternalServerError,
            message: 'Attachment malware scanner is unavailable.',
        }))))
        scanner.once('close', (code) => {
            if (code === 0) return finish(resolve)
            if (code === 1) {
                return finish(() => reject(new AppError({
                    statusCode: 422,
                    code: ERROR_CODES.ValidationError,
                    message: 'Attachment was rejected by the malware scanner.',
                })))
            }
            return finish(() => reject(new AppError({
                statusCode: 503,
                code: ERROR_CODES.InternalServerError,
                message: stderr.trim() || 'Attachment malware scanner failed.',
            })))
        })
        scanner.stdin.end(content)
    })
}

/**
 * Development/test uses an atomic private filesystem. Production writes the
 * normalized object to S3 quarantine, scans it, then promotes it to private/
 * before the database row can become Ready.
 */
export async function saveAutoCareAttachmentObject(
    key: string,
    content: Buffer,
    contentType = 'application/octet-stream',
) {
    assertSafeAutoCareAttachmentObjectKey(key)
    if (content.length < 1 || content.length > MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Attachment size is invalid.',
        })
    }
    if (env.autoCareAttachments.storageProvider === 'filesystem') {
        const target = getAutoCareAttachmentObjectPath(key)
        await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
        await assertFilesystemAttachmentParent(key)
        const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
        try {
            await writeFile(temporary, content, { flag: 'wx', mode: 0o600 })
            await scanAutoCareAttachment(content)
            await rename(temporary, target)
        } catch (error) {
            await unlink(temporary).catch(() => undefined)
            throw error
        }
        return
    }

    const { client, bucket } = getS3Client()
    const quarantineKey = getQuarantineObjectKey(key)
    const checksumHex = createHash('sha256').update(content).digest('hex')
    const checksumBase64 = createHash('sha256').update(content).digest('base64')
    try {
        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: quarantineKey,
            Body: content,
            ContentType: contentType,
            ContentDisposition: 'inline',
            ChecksumSHA256: checksumBase64,
            Metadata: { sha256: checksumHex, state: 'quarantine' },
            ServerSideEncryption: 'AES256',
        }))
        await scanAutoCareAttachment(content)
        await client.send(new CopyObjectCommand({
            Bucket: bucket,
            Key: getPrivateObjectKey(key),
            CopySource: encodeCopySource(bucket, quarantineKey),
            MetadataDirective: 'REPLACE',
            ContentType: contentType,
            ContentDisposition: 'inline',
            Metadata: { sha256: checksumHex, state: 'private' },
            ServerSideEncryption: 'AES256',
        }))
    } finally {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey })).catch(() => undefined)
    }
}

export async function readAutoCareAttachmentObject(key: string) {
    assertSafeAutoCareAttachmentObjectKey(key)
    if (env.autoCareAttachments.storageProvider === 'filesystem') {
        await assertReadableFilesystemAttachment(key)
        try {
            return await readFile(getAutoCareAttachmentObjectPath(key))
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') attachmentNotFound()
            throw error
        }
    }

    try {
        const { client, bucket } = getS3Client()
        const response = await client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: getPrivateObjectKey(key),
        }))
        if (!response.Body) attachmentNotFound()
        if (response.ContentLength !== undefined && response.ContentLength > MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES) {
            attachmentNotFound()
        }
        const body = response.Body
        if (typeof (body as { [Symbol.asyncIterator]?: () => unknown })[Symbol.asyncIterator] === 'function') {
            const chunks: Buffer[] = []
            let bytes = 0
            for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                bytes += buffer.length
                if (bytes > MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES) attachmentNotFound()
                chunks.push(buffer)
            }
            return Buffer.concat(chunks, bytes)
        }
        const content = await body.transformToByteArray()
        if (content.byteLength > MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES) attachmentNotFound()
        return Buffer.from(content)
    } catch (error) {
        if ((error as { name?: string }).name === 'NoSuchKey') attachmentNotFound()
        throw error
    }
}

export async function getAutoCareAttachmentSignedDownloadUrl(key: string, contentType: string) {
    assertSafeAutoCareAttachmentObjectKey(key)
    if (env.autoCareAttachments.storageProvider === 'filesystem') return null
    const { client, bucket } = getS3Client()
    return getSignedUrl(client, new GetObjectCommand({
        Bucket: bucket,
        Key: getPrivateObjectKey(key),
        ResponseContentDisposition: 'inline',
        ResponseContentType: contentType,
        ResponseCacheControl: 'private, no-store',
    }), { expiresIn: env.autoCareAttachments.signedUrlTtlSeconds })
}

export async function removeAutoCareAttachmentObject(key: string) {
    assertSafeAutoCareAttachmentObjectKey(key)
    if (env.autoCareAttachments.storageProvider === 'filesystem') {
        try {
            await assertFilesystemAttachmentParent(key)
        } catch (error: unknown) {
            if (error instanceof AppError && error.code === ERROR_CODES.NotFound) return
            throw error
        }
        await unlink(getAutoCareAttachmentObjectPath(key)).catch((error: unknown) => {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        })
        return
    }
    const { client, bucket } = getS3Client()
    await Promise.all([
        client.send(new DeleteObjectCommand({ Bucket: bucket, Key: getPrivateObjectKey(key) })),
        client.send(new DeleteObjectCommand({ Bucket: bucket, Key: getQuarantineObjectKey(key) })),
    ])
}

export type AutoCareAttachmentObjectEntry = {
    key: string
    lastModifiedAt: number
    storageTier: 'private' | 'quarantine'
}

async function removeAutoCareAttachmentQuarantineObject(key: string) {
    assertSafeAutoCareAttachmentObjectKey(key)
    if (env.autoCareAttachments.storageProvider === 'filesystem') return
    const { client, bucket } = getS3Client()
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: getQuarantineObjectKey(key) }))
}

async function listScopeObjects(scope: AutoCareAttachmentScope) {
    if (env.autoCareAttachments.storageProvider !== 'filesystem') {
        const { client, bucket } = getS3Client()
        const entries: AutoCareAttachmentObjectEntry[] = []
        for (const prefix of [`private/autocare-${scope}/`, `quarantine/autocare-${scope}/`]) {
            let continuationToken: string | undefined
            do {
                const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }))
                for (const object of page.Contents ?? []) {
                    const storageKey = object.Key ?? ''
                    const key = storageKey.startsWith('private/')
                        ? storageKey.slice('private/'.length)
                        : storageKey.startsWith('quarantine/')
                            ? storageKey.slice('quarantine/'.length)
                            : ''
                    if (!attachmentKeyPattern.test(key) || !object.LastModified) continue
                    entries.push({
                        key,
                        lastModifiedAt: object.LastModified.getTime(),
                        storageTier: storageKey.startsWith('quarantine/') ? 'quarantine' : 'private',
                    })
                }
                continuationToken = page.NextContinuationToken
            } while (continuationToken)
        }
        return entries
    }
    const scopeRoot = path.join(attachmentRoot, `autocare-${scope}`)
    let parentEntries
    try {
        const scopeEntry = await lstat(scopeRoot)
        if (!scopeEntry.isDirectory()) return []
        parentEntries = await readdir(scopeRoot, { withFileTypes: true })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw error
    }
    const entries: AutoCareAttachmentObjectEntry[] = []
    for (const parent of parentEntries) {
        if (!parent.isDirectory() || !/^[a-f0-9-]{36}$/i.test(parent.name)) continue
        const parentRoot = path.join(scopeRoot, parent.name)
        const objects = await readdir(parentRoot, { withFileTypes: true })
        for (const object of objects) {
            const key = `autocare-${scope}/${parent.name}/${object.name}`
            if (!object.isFile() || !attachmentKeyPattern.test(key)) continue
            const file = await lstat(path.join(parentRoot, object.name))
            if (!file.isFile() || file.size > MAX_AUTOCARE_ATTACHMENT_STORAGE_BYTES) continue
            entries.push({ key, lastModifiedAt: file.mtimeMs, storageTier: 'private' })
        }
    }
    return entries
}

export function selectAutoCareAttachmentCleanupCandidates(input: {
    entries: readonly AutoCareAttachmentObjectEntry[]
    referencedKeys: readonly string[]
    cutoff: number
}) {
    const referenced = new Set(input.referencedKeys.filter((key) => attachmentKeyPattern.test(key)))
    return input.entries.filter((entry) => entry.lastModifiedAt < input.cutoff
        && (entry.storageTier === 'quarantine' || !referenced.has(entry.key)))
}

export async function cleanupOrphanedAutoCareAttachmentObjects(input: {
    referencedKeys: readonly string[]
    now?: Date
    gracePeriodMs: number
}) {
    const entries = (await Promise.all([
        listScopeObjects('requests'),
        listScopeObjects('chats'),
    ])).flat()
    const cutoff = (input.now ?? new Date()).getTime() - input.gracePeriodMs
    const candidates = selectAutoCareAttachmentCleanupCandidates({
        entries,
        referencedKeys: input.referencedKeys,
        cutoff,
    })
    let failed = 0
    for (const candidate of candidates) {
        try {
            if (candidate.storageTier === 'quarantine') {
                await removeAutoCareAttachmentQuarantineObject(candidate.key)
            } else {
                await removeAutoCareAttachmentObject(candidate.key)
            }
        } catch {
            failed += 1
        }
    }
    return { scanned: entries.length, removed: candidates.length - failed, failed }
}

export async function cleanupExpiredAutoCareAttachments(input: {
    now?: Date
    retentionDays: number
    batchSize: number
}) {
    const now = input.now ?? new Date()
    const cutoff = new Date(now.getTime() - input.retentionDays * 24 * 60 * 60 * 1_000)
    const repository = AppDataSource.getRepository(ServiceAttachmentEntity)
    const attachments = await repository.createQueryBuilder('attachment')
        .where('attachment.createdAt < :cutoff', { cutoff })
        .orderBy('attachment.createdAt', 'ASC')
        .take(input.batchSize)
        .getMany()
    let failed = 0
    let removed = 0
    for (const attachment of attachments) {
        try {
            await removeAutoCareAttachmentObject(attachment.objectKey)
            await repository.delete({ id: attachment.id })
            removed += 1
        } catch {
            failed += 1
        }
    }
    return { scanned: attachments.length, removed, failed }
}
