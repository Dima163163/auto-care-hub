import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import sharp from 'sharp'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_AUTOMOTIVE_ATTACHMENTS_PER_THREAD = 20
export const MAX_AUTOMOTIVE_ATTACHMENT_BYTES_PER_THREAD = 50 * 1024 * 1024
export const AUTOCARE_ATTACHMENT_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AutoCareAttachmentContentType = (typeof AUTOCARE_ATTACHMENT_CONTENT_TYPES)[number]

type AttachmentContentInput = {
    contentBase64: string
    contentType: AutoCareAttachmentContentType
    size: number
}

export type AutoCareAttachmentUploadInput = AttachmentContentInput & {
    fileName: string
}

function invalidAttachment(message: string): never {
    throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message })
}

/**
 * Attachment rows are user-controlled at the database boundary. Keep the
 * response content type on the image allow-list even if a legacy or tampered
 * row bypassed the upload schema. Invalid rows are hidden like missing media
 * instead of being rendered inline as an arbitrary browser document.
 */
export function resolveAutoCareAttachmentContentType(value: string): AutoCareAttachmentContentType {
    if (isAutoCareAttachmentContentType(value)) return value
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Attachment not found.' })
}

export function isAutoCareAttachmentContentType(value: string): value is AutoCareAttachmentContentType {
    return AUTOCARE_ATTACHMENT_CONTENT_TYPES.includes(value as AutoCareAttachmentContentType)
}

export function assertAutoCareAttachmentContentType(value: string): asserts value is AutoCareAttachmentContentType {
    if (!isAutoCareAttachmentContentType(value)) {
        invalidAttachment('Attachment content type is invalid.')
    }
}

export function assertAutoCareAttachmentQuota(input: {
    existingCount: number
    existingBytes: number
    incomingBytes: number
}) {
    if (input.existingCount >= MAX_AUTOMOTIVE_ATTACHMENTS_PER_THREAD) {
        invalidAttachment('This conversation has reached its attachment limit.')
    }
    if (input.existingBytes + input.incomingBytes > MAX_AUTOMOTIVE_ATTACHMENT_BYTES_PER_THREAD) {
        invalidAttachment('This conversation has reached its attachment storage limit.')
    }
}

/**
 * Re-check the complete upload envelope before decoding or writing an object.
 * The HTTP route already applies the same bounds, but service callers and jobs
 * must not be able to bypass them with malformed runtime values.
 */
export function normalizeAutoCareAttachmentInput(input: unknown): AutoCareAttachmentUploadInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (typeof value.fileName !== 'string' || typeof value.contentBase64 !== 'string' || typeof value.contentType !== 'string') return null
    const fileName = value.fileName.normalize('NFKC').trim()
    if (!fileName || fileName.length > 255 || [...fileName].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint < 0x20 || codePoint === 0x7f
    })) return null
    if (!isAutoCareAttachmentContentType(value.contentType)) return null
    if (typeof value.size !== 'number' || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > MAX_ATTACHMENT_BYTES) return null
    const contentBase64 = value.contentBase64.replace(/\s/g, '')
    if (!contentBase64 || contentBase64.length > 14 * 1024 * 1024) return null
    return { fileName, contentType: value.contentType, size: value.size, contentBase64 }
}

function matchesMagicBytes(content: Buffer, contentType: AttachmentContentInput['contentType']) {
    if (contentType === 'image/jpeg') return content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    if (contentType === 'image/png') return content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return content.length >= 12 && content.subarray(0, 4).toString('ascii') === 'RIFF' && content.subarray(8, 12).toString('ascii') === 'WEBP'
}

export function decodeAutoCareAttachment(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) invalidAttachment('Attachment payload is invalid.')
    const value = input as Record<string, unknown>
    if (typeof value.contentType !== 'string') invalidAttachment('Attachment content type is invalid.')
    assertAutoCareAttachmentContentType(value.contentType)
    if (typeof value.size !== 'number' || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > MAX_ATTACHMENT_BYTES) {
        invalidAttachment('Attachment size is invalid.')
    }
    if (typeof value.contentBase64 !== 'string') invalidAttachment('Attachment content is not valid base64.')
    const normalized = value.contentBase64.replace(/\s/g, '')
    if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
        invalidAttachment('Attachment content is not valid base64.')
    }
    const content = Buffer.from(normalized, 'base64')
    if (content.length !== value.size || content.length > MAX_ATTACHMENT_BYTES) {
        invalidAttachment('Attachment content does not match its declared size.')
    }
    if (!matchesMagicBytes(content, value.contentType)) {
        invalidAttachment('Attachment content does not match its declared image type.')
    }
    return content
}

/**
 * Decode and normalize an attachment before it becomes publicly readable.
 * This strips metadata, rejects oversized/decompression-bomb payloads and
 * animated images, and makes the stored bytes match the declared content type.
 */
export async function normalizeAutoCareAttachment(content: Buffer, contentType: AttachmentContentInput['contentType']) {
    assertAutoCareAttachmentContentType(contentType)
    try {
        const metadata = await sharp(content, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
        const width = metadata.width ?? 0
        const height = metadata.height ?? 0
        if (!width || !height || width * height > 40_000_000) {
            invalidAttachment('Attachment dimensions are invalid.')
        }
        if ((metadata.pages ?? 1) > 1) {
            invalidAttachment('Animated images are not supported.')
        }

        const transformer = sharp(content, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate()
        const normalized = contentType === 'image/jpeg'
            ? await transformer.jpeg({ quality: 88, progressive: true }).toBuffer()
            : contentType === 'image/png'
                ? await transformer.png({ compressionLevel: 9 }).toBuffer()
                : await transformer.webp({ quality: 84 }).toBuffer()
        if (normalized.length > MAX_ATTACHMENT_BYTES) invalidAttachment('Attachment is too large after normalization.')
        return normalized
    } catch (error) {
        if (error instanceof AppError) throw error
        invalidAttachment('Attachment must be a valid decodable image.')
    }
}
