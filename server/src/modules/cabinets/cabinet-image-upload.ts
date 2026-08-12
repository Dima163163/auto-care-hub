import { z } from 'zod'
import sharp from 'sharp'

import { AppError } from '../../shared/errors/app-error.js'
import {
    ERROR_CODES,
    type ErrorCode,
} from '../../shared/errors/error-codes.js'
import {
    MAX_CABINET_IMAGE_SIZE_BYTES,
    MAX_CABINET_IMAGE_BASE64_LENGTH,
    uploadCabinetImageSchema,
} from './cabinets.schemas.js'

export type UploadCabinetImageInput = z.infer<typeof uploadCabinetImageSchema>

export const MAX_CABINET_IMAGE_WIDTH = 4_096
export const MAX_CABINET_IMAGE_HEIGHT = 4_096
export const MAX_CABINET_IMAGE_PIXELS = 16_000_000

const imageSignatures = {
    'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
    'image/png': [
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    'image/webp': [
        Buffer.from('RIFF'),
        Buffer.from('WEBP'),
    ],
} as const

function createCabinetImageUploadError(
    code: ErrorCode,
    message: string
) {
    return new AppError({
        statusCode: 400,
        code,
        message,
    })
}

export function validateUploadCabinetImageBody(body: unknown) {
    const result = uploadCabinetImageSchema.safeParse(body)

    if (result.success) {
        return result.data
    }

    const issues = result.error.issues
    const hasMimeTypeIssue = issues.some((issue) =>
        issue.path.includes('mimeType')
    )
    const hasSizeIssue = issues.some((issue) =>
        issue.path.includes('size')
        && issue.code === 'too_big'
    )

    if (hasMimeTypeIssue) {
        throw createCabinetImageUploadError(
            ERROR_CODES.CabinetImageUnsupportedType,
            'Cabinet image must be JPEG, PNG, or WebP.'
        )
    }

    if (hasSizeIssue) {
        throw createCabinetImageUploadError(
            ERROR_CODES.CabinetImageTooLarge,
            `Cabinet image must be ${MAX_CABINET_IMAGE_SIZE_BYTES} bytes or smaller.`
        )
    }

    throw createCabinetImageUploadError(
        ERROR_CODES.CabinetImageInvalidContent,
        'Invalid cabinet image payload.'
    )
}

export function assertCabinetImageContentMatchesSize(
    imageBuffer: Buffer,
    body: Pick<UploadCabinetImageInput, 'size'>
) {
    if (imageBuffer.length === body.size) {
        return
    }

    throw createCabinetImageUploadError(
        ERROR_CODES.CabinetImageInvalidContent,
        'Invalid cabinet image content.'
    )
}

export function decodeCabinetImageBase64(contentBase64: string) {
    if (
        contentBase64.length > MAX_CABINET_IMAGE_BASE64_LENGTH ||
        contentBase64.length % 4 !== 0 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)
    ) {
        throw createCabinetImageUploadError(
            ERROR_CODES.CabinetImageInvalidContent,
            'Invalid cabinet image encoding.'
        )
    }

    const imageBuffer = Buffer.from(contentBase64, 'base64')

    if (imageBuffer.length < 1) {
        throw createCabinetImageUploadError(
            ERROR_CODES.CabinetImageInvalidContent,
            'Invalid cabinet image encoding.'
        )
    }

    return imageBuffer
}

function bufferStartsWith(buffer: Buffer, signature: Buffer, offset = 0) {
    return (
        buffer.length >= offset + signature.length &&
        buffer.subarray(offset, offset + signature.length).equals(signature)
    )
}

export function assertCabinetImageContentMatchesMimeType(
    imageBuffer: Buffer,
    body: Pick<UploadCabinetImageInput, 'mimeType'>
) {
    const isValid = body.mimeType === 'image/webp'
        ? bufferStartsWith(imageBuffer, imageSignatures['image/webp'][0])
            && bufferStartsWith(
                imageBuffer,
                imageSignatures['image/webp'][1],
                8
            )
        : imageSignatures[body.mimeType].some((signature) =>
            bufferStartsWith(imageBuffer, signature)
        )

    if (isValid) {
        return
    }

    throw createCabinetImageUploadError(
        ERROR_CODES.CabinetImageInvalidContent,
        'Cabinet image content does not match its MIME type.'
    )
}

function getSharpOutputFormat(mimeType: UploadCabinetImageInput['mimeType']) {
    if (mimeType === 'image/jpeg') return 'jpeg' as const
    if (mimeType === 'image/png') return 'png' as const
    return 'webp' as const
}

export async function normalizeCabinetImage(input: {
    content: Buffer
    mimeType: UploadCabinetImageInput['mimeType']
}) {
    try {
        const image = sharp(input.content, {
            failOn: 'error',
            limitInputPixels: MAX_CABINET_IMAGE_PIXELS,
            sequentialRead: true,
        })
        const metadata = await image.metadata()
        const width = metadata.width ?? 0
        const height = metadata.height ?? 0
        const expectedFormat = getSharpOutputFormat(input.mimeType)

        if (
            metadata.format !== expectedFormat ||
            !Number.isSafeInteger(width) ||
            !Number.isSafeInteger(height) ||
            width < 1 ||
            height < 1 ||
            width > MAX_CABINET_IMAGE_WIDTH ||
            height > MAX_CABINET_IMAGE_HEIGHT ||
            width * height > MAX_CABINET_IMAGE_PIXELS ||
            (metadata.pages ?? 1) > 1
        ) {
            throw new Error('Image metadata is outside the accepted bounds.')
        }

        const normalized = await image
            .rotate()
            .toFormat(expectedFormat, expectedFormat === 'jpeg'
                ? { quality: 85, mozjpeg: true }
                : expectedFormat === 'png'
                    ? { compressionLevel: 9 }
                    : { quality: 85 })
            .toBuffer()

        if (normalized.length > MAX_CABINET_IMAGE_SIZE_BYTES) {
            throw new Error('Normalized image exceeds the accepted size.')
        }

        return normalized
    } catch {
        throw createCabinetImageUploadError(
            ERROR_CODES.CabinetImageInvalidContent,
            'Cabinet image could not be safely decoded and normalized.'
        )
    }
}
