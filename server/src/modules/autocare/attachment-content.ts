import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_AUTOMOTIVE_ATTACHMENTS_PER_THREAD = 20
export const MAX_AUTOMOTIVE_ATTACHMENT_BYTES_PER_THREAD = 50 * 1024 * 1024

type AttachmentContentInput = {
    contentBase64: string
    contentType: 'image/jpeg' | 'image/png' | 'image/webp'
    size: number
}

function invalidAttachment(message: string): never {
    throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message })
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

function matchesMagicBytes(content: Buffer, contentType: AttachmentContentInput['contentType']) {
    if (contentType === 'image/jpeg') return content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    if (contentType === 'image/png') return content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return content.length >= 12 && content.subarray(0, 4).toString('ascii') === 'RIFF' && content.subarray(8, 12).toString('ascii') === 'WEBP'
}

export function decodeAutoCareAttachment(input: AttachmentContentInput) {
    if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > MAX_ATTACHMENT_BYTES) {
        invalidAttachment('Attachment size is invalid.')
    }
    const normalized = input.contentBase64.replace(/\s/g, '')
    if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
        invalidAttachment('Attachment content is not valid base64.')
    }
    const content = Buffer.from(normalized, 'base64')
    if (content.length !== input.size || content.length > MAX_ATTACHMENT_BYTES) {
        invalidAttachment('Attachment content does not match its declared size.')
    }
    if (!matchesMagicBytes(content, input.contentType)) {
        invalidAttachment('Attachment content does not match its declared image type.')
    }
    return content
}
