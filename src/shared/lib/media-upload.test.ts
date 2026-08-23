import { describe, expect, it } from 'vitest'

import { getSupportedImageMimeType, validateImageUpload } from './media-upload'

describe('media upload validation', () => {
    it('narrows supported image types without assertions', () => {
        const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })

        expect(getSupportedImageMimeType(file)).toBe('image/jpeg')
        expect(validateImageUpload(file)).toEqual({ isValid: true, contentType: 'image/jpeg' })
    })

    it('rejects unsupported MIME types and oversized files', () => {
        const unsupported = new File(['svg'], 'photo.svg', { type: 'image/svg+xml' })
        const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' })

        expect(validateImageUpload(unsupported).isValid).toBe(false)
        expect(validateImageUpload(oversized)).toEqual({ isValid: false, reason: 'imageTooLarge' })
    })
})
