import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

export type AutoCareProviderMediaKind = 'cover' | 'gallery'

const MAX_MEDIA_BYTES = 6 * 1024 * 1024
const mediaPattern = /^([a-f0-9-]+)\.webp$/i

function mediaError(message: string) {
    return new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message })
}

function mediaRoot(kind: AutoCareProviderMediaKind) {
    return path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'media', kind)
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
    await mkdir(mediaRoot(kind), { recursive: true })
    await writeFile(path.join(mediaRoot(kind), fileName), normalized)
    return `/uploads/autocare/media/${kind}/${fileName}`
}

export function assertAutoCareProviderMediaFileName(fileName: string) {
    if (!mediaPattern.test(fileName)) throw mediaError('Invalid provider image file name.')
}

export async function readAutoCareProviderMedia(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    try {
        return await readFile(path.join(mediaRoot(kind), fileName))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider image not found.' })
        throw error
    }
}

export function createAutoCareProviderMediaReadStream(kind: AutoCareProviderMediaKind, fileName: string) {
    assertAutoCareProviderMediaFileName(fileName)
    return createReadStream(path.join(mediaRoot(kind), fileName))
}
