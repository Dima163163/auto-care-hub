import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const MAX_LOGO_BYTES = 1024 * 1024
const logoRoot = path.resolve(env.cabinetUploadsDir, '..', 'autocare', 'logos')
const logoPattern = /^([a-f0-9-]+)\.webp$/i

function logoError(message: string) {
    return new AppError({ statusCode: 400, code: ERROR_CODES.BadRequest, message })
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
    await mkdir(logoRoot, { recursive: true })
    await writeFile(path.join(logoRoot, fileName), normalized)
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
    return createReadStream(path.join(logoRoot, fileName))
}

export async function readAutoCareProviderLogo(fileName: string) {
    assertAutoCareProviderLogoFileName(fileName)
    try {
        return await readFile(path.join(logoRoot, fileName))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider logo not found.' })
        }
        throw error
    }
}
