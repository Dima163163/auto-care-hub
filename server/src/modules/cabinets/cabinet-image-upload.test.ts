import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { ERROR_CODES } from '../../shared/errors/error-codes'
import { AppError } from '../../shared/errors/app-error'
import {
    assertCabinetImageContentMatchesMimeType,
    assertCabinetImageContentMatchesSize,
    decodeCabinetImageBase64,
    MAX_CABINET_IMAGE_PIXELS,
    MAX_CABINET_IMAGE_WIDTH,
    normalizeCabinetImage,
    validateUploadCabinetImageBody,
} from './cabinet-image-upload'

const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const webpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBP'),
])

const validPayload = {
    fileName: 'cabinet.webp',
    mimeType: 'image/webp',
    size: 4,
    contentBase64: 'dGVzdA==',
}

function expectAppErrorCode(error: unknown, code: string) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe(code)
}

describe('cabinet image upload validation', () => {
    it('returns valid upload payload', () => {
        expect(validateUploadCabinetImageBody(validPayload)).toEqual(validPayload)
    })

    it('throws stable code for unsupported image type', () => {
        expect(() =>
            validateUploadCabinetImageBody({
                ...validPayload,
                mimeType: 'image/gif',
            })
        ).toThrow(AppError)

        try {
            validateUploadCabinetImageBody({
                ...validPayload,
                mimeType: 'image/gif',
            })
        } catch (error) {
            expectAppErrorCode(error, ERROR_CODES.CabinetImageUnsupportedType)
        }
    })

    it('throws stable code for oversized image payload', () => {
        try {
            validateUploadCabinetImageBody({
                ...validPayload,
                size: 1024 * 1024 + 1,
            })
        } catch (error) {
            expectAppErrorCode(error, ERROR_CODES.CabinetImageTooLarge)
        }
    })

    it('throws stable code for invalid image content size', () => {
        try {
            assertCabinetImageContentMatchesSize(Buffer.from('test'), {
                size: 5,
            })
        } catch (error) {
            expectAppErrorCode(error, ERROR_CODES.CabinetImageInvalidContent)
        }
    })

    it('rejects malformed base64 before image decoding', () => {
        expect(() => decodeCabinetImageBase64('not-base64!')).toThrow(AppError)
    })

    it.each([
        ['image/jpeg' as const, jpegBuffer],
        ['image/png' as const, pngBuffer],
        ['image/webp' as const, webpBuffer],
    ])('accepts content matching %s magic bytes', (mimeType, imageBuffer) => {
        expect(() =>
            assertCabinetImageContentMatchesMimeType(imageBuffer, {
                mimeType,
            })
        ).not.toThrow()
    })

    it.each([
        ['image/jpeg' as const, pngBuffer],
        ['image/png' as const, webpBuffer],
        ['image/webp' as const, jpegBuffer],
        ['image/webp' as const, Buffer.from('RIFF0000FAIL')],
    ])('rejects content not matching %s magic bytes', (mimeType, imageBuffer) => {
        expect(() =>
            assertCabinetImageContentMatchesMimeType(imageBuffer, {
                mimeType,
            })
        ).toThrow(AppError)

        try {
            assertCabinetImageContentMatchesMimeType(imageBuffer, {
                mimeType,
            })
        } catch (error) {
            expectAppErrorCode(error, ERROR_CODES.CabinetImageInvalidContent)
        }
    })

    it('decodes, strips metadata, and re-encodes accepted images', async () => {
        const source = await sharp({
            create: {
                width: 8,
                height: 6,
                channels: 4,
                background: { r: 20, g: 40, b: 60, alpha: 0.5 },
            },
        })
            .png()
            .withMetadata({ orientation: 6 })
            .toBuffer()

        const normalized = await normalizeCabinetImage({
            content: source,
            mimeType: 'image/png',
        })
        const metadata = await sharp(normalized).metadata()

        expect(metadata.format).toBe('png')
        expect(metadata.width).toBe(6)
        expect(metadata.height).toBe(8)
        expect(metadata.exif).toBeUndefined()
    })

    it('rejects images wider than the configured dimension ceiling', async () => {
        const source = await sharp({
            create: {
                width: MAX_CABINET_IMAGE_WIDTH + 1,
                height: 1,
                channels: 3,
                background: { r: 20, g: 40, b: 60 },
            },
        })
            .png()
            .toBuffer()

        await expect(
            normalizeCabinetImage({
                content: source,
                mimeType: 'image/png',
            })
        ).rejects.toMatchObject({ code: ERROR_CODES.CabinetImageInvalidContent })
    })

    it('rejects images that exceed the total pixel ceiling', async () => {
        const source = await sharp({
            create: {
                width: 4_000,
                height: Math.ceil(MAX_CABINET_IMAGE_PIXELS / 4_000) + 1,
                channels: 3,
                background: { r: 20, g: 40, b: 60 },
            },
        })
            .png()
            .toBuffer()

        await expect(
            normalizeCabinetImage({
                content: source,
                mimeType: 'image/png',
            })
        ).rejects.toMatchObject({ code: ERROR_CODES.CabinetImageInvalidContent })
    })
})
