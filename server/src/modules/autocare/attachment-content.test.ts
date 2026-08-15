import { describe, expect, it } from 'vitest'

import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment } from './attachment-content.js'

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('AutoCare attachment content validation', () => {
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
})

describe('AutoCare attachment quotas', () => {
    it('rejects too many attachments or too much aggregate content', () => {
        expect(() => assertAutoCareAttachmentQuota({ existingCount: 20, existingBytes: 0, incomingBytes: 1 })).toThrow('attachment limit')
        expect(() => assertAutoCareAttachmentQuota({ existingCount: 1, existingBytes: 50 * 1024 * 1024, incomingBytes: 1 })).toThrow('storage limit')
    })
})
