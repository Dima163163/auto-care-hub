import { closeSync, constants as fsConstants, createReadStream, fstatSync, lstatSync, openSync } from 'node:fs'
import { lstat, mkdir, open, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { selectOrphanAutoCareMedia } from './orphan-media-policy.js'

const MAX_LOGO_BYTES = 1024 * 1024
const MAX_LOGO_FILE_NAME_LENGTH = 128
const logoPattern = /^([a-f0-9-]+)\.webp$/i

function isProviderLogoFileName(fileName: string) {
    return fileName.length <= MAX_LOGO_FILE_NAME_LENGTH && logoPattern.test(fileName)
}

function logoError(message: string) {
    return new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message })
}

function providerLogoNotFound(): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider logo not found.' })
}

function logoRoot() {
    return path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'logos')
}

async function assertProviderLogoRoot(allowMissing = false) {
    const root = logoRoot()
    const parent = path.dirname(root)
    try {
        const parentEntry = await lstat(parent)
        if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) providerLogoNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            if (allowMissing) return false
            providerLogoNotFound()
        }
        throw error
    }
    try {
        const rootEntry = await lstat(root)
        if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) providerLogoNotFound()
        return true
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            if (allowMissing) return false
            providerLogoNotFound()
        }
        throw error
    }
}

function assertProviderLogoRootSync() {
    const root = logoRoot()
    const parent = path.dirname(root)
    try {
        const parentEntry = lstatSync(parent)
        if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) providerLogoNotFound()
        const rootEntry = lstatSync(root)
        if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) providerLogoNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerLogoNotFound()
        throw error
    }
}

async function readRegularProviderLogoFile(filePath: string) {
    let handle: Awaited<ReturnType<typeof open>> | null = null
    try {
        const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
        handle = await open(filePath, openFlags)
        const file = await handle.stat()
        if (!file.isFile() || file.size < 1 || file.size > MAX_LOGO_BYTES) providerLogoNotFound()
        const content = await handle.readFile()
        if (content.length < 1 || content.length > MAX_LOGO_BYTES) providerLogoNotFound()
        return content
    } catch (error) {
        if (error instanceof AppError) throw error
        if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) providerLogoNotFound()
        throw error
    } finally {
        await handle?.close().catch(() => undefined)
    }
}

export function decodeAutoCareProviderLogo(contentBase64: string) {
    if (contentBase64.length === 0 || contentBase64.length > Math.ceil(MAX_LOGO_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
        throw logoError('Invalid provider logo encoding.')
    }
    const content = Buffer.from(contentBase64, 'base64')
    if (content.length === 0 || content.length > MAX_LOGO_BYTES) throw logoError('Provider logo is too large.')
    return content
}

export async function saveAutoCareProviderLogo(content: Buffer) {
    let normalized: Buffer
    try {
        normalized = await sharp(content, { failOn: 'error', limitInputPixels: 16_000_000 })
            .resize({ width: 512, height: 512, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .webp({ quality: 88 })
            .toBuffer()
    } catch {
        throw logoError('Provider logo must be a valid image.')
    }
    if (normalized.length > MAX_LOGO_BYTES) throw logoError('Provider logo is too large.')
    const fileName = `${randomUUID()}.webp`
    const root = logoRoot()
    await assertProviderLogoRoot(true)
    await mkdir(root, { recursive: true, mode: 0o700 })
    await assertProviderLogoRoot()
    const target = path.join(root, fileName)
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
    try {
        await writeFile(temporary, normalized, { flag: 'wx', mode: 0o600 })
        await rename(temporary, target)
    } catch (error) {
        await unlink(temporary).catch(() => undefined)
        throw error
    }
    return `/uploads/autocare/logos/${fileName}`
}

export function assertAutoCareProviderLogoFileName(fileName: string) {
    if (!isProviderLogoFileName(fileName)) throw logoError('Invalid provider logo file name.')
}

export function getAutoCareProviderLogoFileName(value: string) {
    const match = /^\/uploads\/autocare\/logos\/(.+)$/.exec(value)
    return match && isProviderLogoFileName(match[1] ?? '') ? match[1] : null
}

export function createAutoCareProviderLogoReadStream(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    assertProviderLogoRootSync()
    const target = path.join(logoRoot(), fileName)
    let fileDescriptor: number | undefined
    try {
        const openFlags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
        fileDescriptor = openSync(target, openFlags)
        const file = fstatSync(fileDescriptor)
        if (!file.isFile() || file.size < 1 || file.size > MAX_LOGO_BYTES) providerLogoNotFound()
    } catch (error) {
        if (fileDescriptor !== undefined) closeSync(fileDescriptor)
        if (error instanceof AppError) throw error
        if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) providerLogoNotFound()
        throw error
    }
    return createReadStream(target, { fd: fileDescriptor, autoClose: true })
}

export async function readAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    await assertProviderLogoRoot()
    return readRegularProviderLogoFile(path.join(logoRoot(), fileName))
}

export async function removeAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    if (!(await assertProviderLogoRoot(true))) return
    await unlink(path.join(logoRoot(), fileName)).catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
}

export async function cleanupOrphanedAutoCareProviderLogos(input: {
    referencedUrls: readonly string[]
    now?: Date
    gracePeriodMs: number
}) {
    let names: string[]
    try {
        if (!(await assertProviderLogoRoot(true))) return { scanned: 0, removed: 0, failed: 0 }
        names = await readdir(logoRoot())
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { scanned: 0, removed: 0, failed: 0 }
        throw error
    }
    const referenced = new Set(input.referencedUrls
        .map(getAutoCareProviderLogoFileName)
        .filter((value): value is string => Boolean(value)))
    const entries = (await Promise.allSettled(names
        .filter(isProviderLogoFileName)
        .map(async (fileName) => {
            const file = await lstat(path.join(logoRoot(), fileName))
            if (!file.isFile() || file.size > MAX_LOGO_BYTES) return null
            return { fileName, lastModifiedAt: file.mtimeMs }
        })))
        .flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
    const candidates = selectOrphanAutoCareMedia({ entries, referencedFileNames: referenced, now: (input.now ?? new Date()).getTime(), gracePeriodMs: input.gracePeriodMs })
    let failed = 0
    for (const candidate of candidates) {
        try {
            await unlink(path.join(logoRoot(), candidate.fileName))
        } catch {
            failed += 1
        }
    }
    return { scanned: candidates.length, removed: candidates.length - failed, failed }
}
