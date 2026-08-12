import { describe, expect, it } from 'vitest'

import {
    CABINET_IMAGE_CACHE_CONTROL,
    mapCabinetImageResponse,
} from './cabinet-image-response.js'

describe('cabinet image cache policy', () => {
    it('marks UUID-backed original and variant URLs as immutable', () => {
        expect(CABINET_IMAGE_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
    })
})

describe('cabinet image response metadata', () => {
    it('returns stable public metadata and nullable optional fields', () => {
        expect(mapCabinetImageResponse({
            url: '/uploads/cabinets/image.webp',
            contentType: 'image/webp',
            bytes: 42,
            checksum: 'a'.repeat(64),
            width: 640,
            height: 480,
        })).toEqual({
            url: '/uploads/cabinets/image.webp',
            contentType: 'image/webp',
            bytes: 42,
            checksum: 'a'.repeat(64),
            dimensions: { width: 640, height: 480 },
        })

        expect(mapCabinetImageResponse({ url: '/image.webp', contentType: 'image/webp', bytes: 1 }).dimensions).toBeNull()
    })
})
