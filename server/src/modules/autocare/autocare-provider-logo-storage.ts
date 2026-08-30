import { createReadStream, lstatSync } from 'node:fs'
import { lstat, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { selectOrphanAutoCareMedia } from './orphan-media-policy.js'

const MAX_LOGO_BYTES = 1024 * 1024
const logoRoot = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'logos')
const logoPattern = /^([a-f0-9-]+)\.webp$/i

function logoError(message: string) {
    return new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message })
}

function providerLogoNotFound(): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider logo not found.' })
}

async function assertRegularProviderLogoFile(filePath: string) {
    try {
        const file = await lstat(filePath)
        if (!file.isFile() || file.size > MAX_LOGO_BYTES) providerLogoNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerLogoNotFound()
        throw error
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
    await mkdir(logoRoot, { recursive: true, mode: 0o700 })
    const target = path.join(logoRoot, fileName)
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
    if (!logoPattern.test(fileName)) throw logoError('Invalid provider logo file name.')
}

export function getAutoCareProviderLogoFileName(value: string) {
    const match = /^\/uploads\/autocare\/logos\/(.+)$/.exec(value)
    return match && logoPattern.test(match[1] ?? '') ? match[1] : null
}

export function createAutoCareProviderLogoReadStream(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    const target = path.join(logoRoot, fileName)
    try {
        const file = lstatSync(target)
        if (!file.isFile() || file.size > MAX_LOGO_BYTES) providerLogoNotFound()
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerLogoNotFound()
        throw error
    }
    return createReadStream(target)
}

export async function readAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    const target = path.join(logoRoot, fileName)
    await assertRegularProviderLogoFile(target)
    try {
        return await readFile(target)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') providerLogoNotFound()
        throw error
    }
}

export async function removeAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    await unlink(path.join(logoRoot, fileName)).catch((error: unknown) => {
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
        names = await readdir(logoRoot)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { scanned: 0, removed: 0, failed: 0 }
        throw error
    }
    const referenced = new Set(input.referencedUrls
        .map(getAutoCareProviderLogoFileName)
        .filter((value): value is string => Boolean(value)))
    const entries = (await Promise.allSettled(names
        .filter((fileName) => logoPattern.test(fileName))
        .map(async (fileName) => ({ fileName, lastModifiedAt: (await stat(path.join(logoRoot, fileName))).mtimeMs }))))
        .flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    const candidates = selectOrphanAutoCareMedia({ entries, referencedFileNames: referenced, now: (input.now ?? new Date()).getTime(), gracePeriodMs: input.gracePeriodMs })
    let failed = 0
    for (const candidate of candidates) {
        try {
            await unlink(path.join(logoRoot, candidate.fileName))
        } catch {
            failed += 1
        }
    }
    return { scanned: candidates.length, removed: candidates.length - failed, failed }
}
