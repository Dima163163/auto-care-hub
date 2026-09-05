import { describe, expect, it } from 'vitest'

import { assertAutoCareAttachmentContentType, assertAutoCareAttachmentQuota, decodeAutoCareAttachment, isAutoCareAttachmentContentType, normalizeAutoCareAttachment, normalizeAutoCareAttachmentInput, resolveAutoCareAttachmentContentType } from './attachment-content.js'

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

describe('AutoCare attachment content validation', () => {
    it('normalizes the complete upload envelope before decoding', () => {
        expect(normalizeAutoCareAttachmentInput({ fileName: '  brake\u00a0photo.png  ', contentBase64: '  iVBORw==  ', contentType: 'image/png', size: 4 })).toEqual({ fileName: 'brake photo.png', contentBase64: 'iVBORw==', contentType: 'image/png', size: 4 })
        expect(normalizeAutoCareAttachmentInput({ fileName: 'bad\nname.png', contentBase64: 'AAAA', contentType: 'image/png', size: 3 })).toBeNull()
        expect(normalizeAutoCareAttachmentInput({ fileName: 'photo.png', contentBase64: 'AAAA', contentType: 'text/html', size: 3 })).toBeNull()
        expect(normalizeAutoCareAttachmentInput(null)).toBeNull()
    })

    it('rejects unsupported content types before decoding or normalization', async () => {
        expect(() => assertAutoCareAttachmentContentType('text/html')).toThrowError(expect.objectContaining({ statusCode: 422 }))
        expect(() => decodeAutoCareAttachment({
            contentBase64: 'AAAA',
            contentType: 'text/html',
            size: 3,
        } as never)).toThrowError(expect.objectContaining({ statusCode: 422 }))
        expect(() => decodeAutoCareAttachment(null)).toThrowError(expect.objectContaining({ statusCode: 422 }))
        await expect(normalizeAutoCareAttachment(Buffer.from('not-an-image'), 'text/html' as never))
            .rejects.toMatchObject({ statusCode: 422 })
    })

    it('allows only browser-safe image content types for attachment responses', () => {
        expect(resolveAutoCareAttachmentContentType('image/jpeg')).toBe('image/jpeg')
        expect(resolveAutoCareAttachmentContentType('image/png')).toBe('image/png')
        expect(resolveAutoCareAttachmentContentType('image/webp')).toBe('image/webp')
        expect(isAutoCareAttachmentContentType('image/png')).toBe(true)
        expect(isAutoCareAttachmentContentType('text/html')).toBe(false)
        expect(() => resolveAutoCareAttachmentContentType('text/html')).toThrowError(expect.objectContaining({ statusCode: 404 }))
    })

    it('accepts content whose declared type and byte length match', () => {
        const contentBase64 = pngHeader.toString('base64')
        expect(decodeAutoCareAttachment({ contentBase64, contentType: 'image/png', size: pngHeader.length })).toEqual(pngHeader)
    })

    it('rejects a mismatched magic header even when the size is valid', () => {
        const content = Buffer.from('not-an-image')
        expect(() => decodeAutoCareAttachment({ contentBase64: content.toString('base64'), contentType: 'image/png', size: content.length })).toThrow('image type')
    })

    it('rejects malformed base64 instead of silently decoding it', () => {
        expect(() => decodeAutoCareAttachment({ contentBase64: '%%%=', contentType: 'image/png', size: 1 })).toThrow('base64')
    })

    it('rejects declared payloads above the per-file abuse limit before decoding', () => {
        expect(() => decodeAutoCareAttachment({ contentBase64: 'AAAA', contentType: 'image/png', size: 10 * 1024 * 1024 + 1 })).toThrow('size is invalid')
    })

    it('rejects padding and byte-length mismatches', () => {
        const contentBase64 = pngHeader.toString('base64')
        expect(() => decodeAutoCareAttachment({ contentBase64, contentType: 'image/png', size: pngHeader.length - 1 })).toThrow('declared size')
    })
})

describe('AutoCare attachment quotas', () => {
    it('rejects too many attachments or too much aggregate content', () => {
        expect(() => assertAutoCareAttachmentQuota({ existingCount: 20, existingBytes: 0, incomingBytes: 1 })).toThrow('attachment limit')
        expect(() => assertAutoCareAttachmentQuota({ existingCount: 1, existingBytes: 50 * 1024 * 1024, incomingBytes: 1 })).toThrow('storage limit')
    })

    it('allows the exact aggregate byte boundary and rejects only the next byte', () => {
        expect(() => assertAutoCareAttachmentQuota({ existingCount: 19, existingBytes: 50 * 1024 * 1024 - 1, incomingBytes: 1 })).not.toThrow()
        expect(() => assertAutoCareAttachmentQuota({ existingCount: 19, existingBytes: 50 * 1024 * 1024 - 1, incomingBytes: 2 })).toThrow('storage limit')
    })
})

describe('AutoCare attachment normalization', () => {
    it('normalizes a decodable image before storage', async () => {
        const normalized = await normalizeAutoCareAttachment(onePixelPng, 'image/png')
        await expect(import('sharp').then(({ default: sharp }) => sharp(normalized).metadata())).resolves.toMatchObject({ width: 1, height: 1, format: 'png' })
    })

    it('strips EXIF metadata during normalization', async () => {
        const { default: sharp } = await import('sharp')
        const source = await sharp({
            create: {
                width: 2,
                height: 2,
                channels: 3,
                background: { r: 20, g: 40, b: 60 },
            },
        }).withMetadata({ exif: { IFD0: { Artist: 'AutoCare test' } } }).jpeg().toBuffer()
        const normalized = await normalizeAutoCareAttachment(source, 'image/jpeg')
        const metadata = await sharp(normalized).metadata()
        expect(metadata.exif).toBeUndefined()
    })

    it('rejects a magic-header payload that is not decodable', async () => {
        await expect(normalizeAutoCareAttachment(pngHeader, 'image/png')).rejects.toThrow('decodable image')
    })
})
