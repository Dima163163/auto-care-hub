import { describe, expect, it } from 'vitest'

import { isAllowedCabinetPhotoUrl } from './cabinet-photo-url.js'

describe('cabinet photo URL policy', () => {
    const hosts = ['cdn.example.com']

    it('allows owned uploads and exact HTTPS hosts', () => {
        expect(isAllowedCabinetPhotoUrl('/uploads/cabinets/abc-123.webp', hosts)).toBe(true)
        expect(isAllowedCabinetPhotoUrl('https://CDN.example.com/photos/1.jpg', hosts)).toBe(true)
    })

    it('rejects HTTP, credentials, fragments, and unlisted hosts', () => {
        expect(isAllowedCabinetPhotoUrl('http://cdn.example.com/photos/1.jpg', hosts)).toBe(false)
        expect(isAllowedCabinetPhotoUrl('https://user:pass@cdn.example.com/photos/1.jpg', hosts)).toBe(false)
        expect(isAllowedCabinetPhotoUrl('https://cdn.example.com/photos/1.jpg#secret', hosts)).toBe(false)
        expect(isAllowedCabinetPhotoUrl('https://evil.example.com/photos/1.jpg', hosts)).toBe(false)
    })
})
