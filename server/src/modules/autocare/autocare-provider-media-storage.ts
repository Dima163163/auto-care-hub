import { createReadStream, lstatSync } from 'node:fs'
import { lstat, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { selectOrphanAutoCareMedia } from './orphan-media-policy.js'

export type AutoCareProviderMediaKind = 'cover' | 'gallery'

const MAX_MEDIA_BYTES = 6 * 1024 * 1024
const mediaPattern = /^([a-f0-9-]+)\.webp$/i

function mediaError(message: string) {
    return new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message })
}

function mediaRoot(kind: AutoCareProviderMediaKind) {
    return path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'media', kind)
}

function providerMediaNotFound(): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider image not found.' })
}

async function assertRegularProviderMediaFile(filePath: string) {
    try {
        const file = await lstat(filePath)
        if (!file.isFile() || file.size > MAX_MEDIA_BYTES) providerMediaNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerMediaNotFound()
        throw error
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
    await mkdir(mediaRoot(kind), { recursive: true, mode: 0o700 })
    const target = path.join(mediaRoot(kind), fileName)
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
    if (!mediaPattern.test(fileName)) throw mediaError('Invalid provider image file name.')
}

export function getAutoCareProviderMediaFileName(value: string, kind: AutoCareProviderMediaKind) {
    const prefix = `/uploads/autocare/media/${kind}/`
    const fileName = value.startsWith(prefix) ? value.slice(prefix.length) : null
    return fileName && mediaPattern.test(fileName) ? fileName : null
}

export async function readAutoCareProviderMedia(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    const target = path.join(mediaRoot(kind), fileName)
    await assertRegularProviderMediaFile(target)
    try {
        return await readFile(target)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerMediaNotFound()
        throw error
    }
}

export function createAutoCareProviderMediaReadStream(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    const target = path.join(mediaRoot(kind), fileName)
    try {
        const file = lstatSync(target)
        if (!file.isFile() || file.size > MAX_MEDIA_BYTES) providerMediaNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerMediaNotFound()
        throw error
    }
    return createReadStream(target)
}

export async function removeAutoCareProviderMedia(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
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
        names = await readdir(root)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { scanned: 0, removed: 0, failed: 0 }
        throw error
    }
    const prefix = `/uploads/autocare/media/${input.kind}/`
    const referenced = new Set(input.referencedUrls
        .filter((value) => value.startsWith(prefix))
        .map((value) => value.slice(prefix.length))
        .filter((value) => mediaPattern.test(value)))
    const entries = (await Promise.allSettled(names
        .filter((fileName) => mediaPattern.test(fileName))
        .map(async (fileName) => ({ fileName, lastModifiedAt: (await stat(path.join(root, fileName))).mtimeMs }))))
        .flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
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
