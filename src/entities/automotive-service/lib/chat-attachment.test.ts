import { describe, expect, it } from 'vitest'

import { validateChatAttachment } from './chat-attachment'

function file(name: string, type: string, size = 1024) {
    return new File([new Uint8Array(size)], name, { type })
}

describe('validateChatAttachment', () => {
    it('returns the supported content type', () => {
        expect(validateChatAttachment(file('damage.webp', 'image/webp'))).toEqual({ valid: true, contentType: 'image/webp' })
    })

    it('reports missing and unsupported files', () => {
        expect(validateChatAttachment(undefined)).toEqual({ valid: false, reason: 'missing' })
        expect(validateChatAttachment(file('document.pdf', 'application/pdf'))).toEqual({ valid: false, reason: 'imageTypeNotSupported' })
    })

    it('rejects oversized images before upload', () => {
        expect(validateChatAttachment(file('large.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1))).toEqual({ valid: false, reason: 'imageTooLarge' })
    })
})
