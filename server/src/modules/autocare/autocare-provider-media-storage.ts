import { closeSync, constants as fsConstants, createReadStream, fstatSync, lstatSync, openSync } from 'node:fs'
import { lstat, mkdir, open, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { selectOrphanAutoCareMedia } from './orphan-media-policy.js'

export type AutoCareProviderMediaKind = 'cover' | 'gallery'

const MAX_MEDIA_BYTES = 6 * 1024 * 1024
const MAX_MEDIA_FILE_NAME_LENGTH = 128
const mediaPattern = /^([a-f0-9-]+)\.webp$/i

function isProviderMediaFileName(fileName: string) {
    return fileName.length <= MAX_MEDIA_FILE_NAME_LENGTH && mediaPattern.test(fileName)
}

function mediaError(message: string) {
    return new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message })
}

function mediaRoot(kind: AutoCareProviderMediaKind) {
    return path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'media', kind)
}

function providerMediaNotFound(): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider image not found.' })
}

async function assertProviderMediaRoot(kind: AutoCareProviderMediaKind, allowMissing = false) {
    const root = mediaRoot(kind)
    const parent = path.dirname(root)
    try {
        const parentEntry = await lstat(parent)
        if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) providerMediaNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            if (allowMissing) return false
            providerMediaNotFound()
        }
        throw error
    }
    try {
        const rootEntry = await lstat(root)
        if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) providerMediaNotFound()
        return true
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            if (allowMissing) return false
            providerMediaNotFound()
        }
        throw error
    }
}

function assertProviderMediaRootSync(kind: AutoCareProviderMediaKind) {
    const root = mediaRoot(kind)
    const parent = path.dirname(root)
    try {
        const parentEntry = lstatSync(parent)
        if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) providerMediaNotFound()
        const rootEntry = lstatSync(root)
        if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) providerMediaNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerMediaNotFound()
        throw error
    }
}

async function readRegularProviderMediaFile(filePath: string) {
    let handle: Awaited<ReturnType<typeof open>> | null = null
    try {
        const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
        handle = await open(filePath, openFlags)
        const file = await handle.stat()
        if (!file.isFile() || file.size < 1 || file.size > MAX_MEDIA_BYTES) providerMediaNotFound()
        const content = await handle.readFile()
        if (content.length < 1 || content.length > MAX_MEDIA_BYTES) providerMediaNotFound()
        return content
    } catch (error) {
        if (error instanceof AppError) throw error
        if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) providerMediaNotFound()
        throw error
    } finally {
        await handle?.close().catch(() => undefined)
    }
}

export function decodeAutoCareProviderMedia(contentBase64: string) {
    if (contentBase64.length === 0 || contentBase64.length > Math.ceil(MAX_MEDIA_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
        throw mediaError('Invalid provider image encoding.')
    }
    const content = Buffer.from(contentBase64, 'base64')
    if (content.length === 0 || content.length > MAX_MEDIA_BYTES) throw mediaError('Provider image is too large.')
    return content
}

export async function saveAutoCareProviderMedia(kind: AutoCareProviderMediaKind, content: Buffer) {
    let normalized: Buffer
    try {
        normalized = await sharp(content, { failOn: 'error', limitInputPixels: 40_000_000 })
            .resize(kind === 'cover' ? { width: 1800, height: 900, fit: 'cover', position: 'centre' } : { width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 84 })
            .toBuffer()
    } catch {
        throw mediaError('Provider image must be a valid image.')
    }
    if (normalized.length > MAX_MEDIA_BYTES) throw mediaError('Provider image is too large.')
    const fileName = `${randomUUID()}.webp`
    const root = mediaRoot(kind)
    await assertProviderMediaRoot(kind, true)
    await mkdir(root, { recursive: true, mode: 0o700 })
    await assertProviderMediaRoot(kind)
    const target = path.join(root, fileName)
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
    try {
        await writeFile(temporary, normalized, { flag: 'wx', mode: 0o600 })
        await rename(temporary, target)
    } catch (error) {
        await unlink(temporary).catch(() => undefined)
        throw error
    }
    return `/uploads/autocare/media/${kind}/${fileName}`
}

export function assertAutoCareProviderMediaFileName(fileName: string) {
    if (!isProviderMediaFileName(fileName)) throw mediaError('Invalid provider image file name.')
}

export function getAutoCareProviderMediaFileName(value: string, kind: AutoCareProviderMediaKind) {
    const prefix = `/uploads/autocare/media/${kind}/`
    const fileName = value.startsWith(prefix) ? value.slice(prefix.length) : null
    return fileName && isProviderMediaFileName(fileName) ? fileName : null
}

export function getAutoCareProviderMediaStorageTarget(
    reference: string,
    kind: AutoCareProviderMediaKind,
) {
    const fileName = getAutoCareProviderMediaFileName(reference, kind)
    return fileName ? { kind, fileName } : null
}

export async function readAutoCareProviderMedia(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    await assertProviderMediaRoot(kind)
    const target = path.join(mediaRoot(kind), fileName)
    return readRegularProviderMediaFile(target)
}

export function createAutoCareProviderMediaReadStream(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    assertProviderMediaRootSync(kind)
    const target = path.join(mediaRoot(kind), fileName)
    let fileDescriptor: number | undefined
    try {
        const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
        fileDescriptor = openSync(target, openFlags)
        const file = fstatSync(fileDescriptor)
        if (!file.isFile() || file.size < 1 || file.size > MAX_MEDIA_BYTES) providerMediaNotFound()
        return createReadStream(target, { fd: fileDescriptor, autoClose: true })
    } catch (error) {
        if (fileDescriptor !== undefined) closeSync(fileDescriptor)
        if (error instanceof AppError) throw error
        if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) providerMediaNotFound()
        throw error
    }
}

export async function removeAutoCareProviderMedia(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    if (!(await assertProviderMediaRoot(kind, true))) return
    await unlink(path.join(mediaRoot(kind), fileName)).catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
}

export async function cleanupOrphanedAutoCareProviderMedia(input: {
    kind: AutoCareProviderMediaKind
    referencedUrls: readonly string[]
    now?: Date
    gracePeriodMs: number
}) {
    const root = mediaRoot(input.kind)
    let names: string[]
    try {
        if (!(await assertProviderMediaRoot(input.kind, true))) return { scanned: 0, removed: 0, failed: 0 }
        names = await readdir(root)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { scanned: 0, removed: 0, failed: 0 }
        throw error
    }
    const prefix = `/uploads/autocare/media/${input.kind}/`
    const referenced = new Set(input.referencedUrls
        .filter((value) => value.startsWith(prefix))
        .map((value) => value.slice(prefix.length))
        .filter(isProviderMediaFileName))
    const entries = (await Promise.allSettled(names
        .filter(isProviderMediaFileName)
        .map(async (fileName) => {
            const file = await lstat(path.join(root, fileName))
            if (!file.isFile() || file.size > MAX_MEDIA_BYTES) return null
            return { fileName, lastModifiedAt: file.mtimeMs }
        })))
        .flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
    const candidates = selectOrphanAutoCareMedia({ entries, referencedFileNames: referenced, now: (input.now ?? new Date()).getTime(), gracePeriodMs: input.gracePeriodMs })
    let failed = 0
    for (const candidate of candidates) {
        try {
            await unlink(path.join(root, candidate.fileName))
        } catch {
            failed += 1
        }
    }
    return { scanned: candidates.length, removed: candidates.length - failed, failed }
}
