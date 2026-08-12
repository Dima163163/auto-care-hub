import { describe, expect, it } from 'vitest'

import type { StoredCabinetImageManifest } from './cabinet-image-manifest.js'
import { toPublicCabinetImageAsset } from './cabinets.mappers.js'

const storedManifest: StoredCabinetImageManifest = {
    originalKey: 'a0000000-0000-4000-8000-000000000001.jpg',
    version: 'a'.repeat(64),
    original: {
        key: 'a0000000-0000-4000-8000-000000000001.jpg',
        contentType: 'image/jpeg',
        bytes: 42,
        width: 1600,
        height: 1200,
        checksum: 'a'.repeat(64),
    },
    variants: {
        thumbnail: {
            key: 'a0000000-0000-4000-8000-000000000001-thumb.webp',
            contentType: 'image/webp',
            bytes: 12,
            width: 640,
            height: 480,
            checksum: 'b'.repeat(64),
        },
        preview: {
            key: 'a0000000-0000-4000-8000-000000000001-preview.webp',
            contentType: 'image/webp',
            bytes: 24,
            width: 1280,
            height: 960,
            checksum: 'c'.repeat(64),
        },
    },
}

describe('cabinet image response manifest', () => {
    it('exposes explicit derivative URLs for uploaded originals', () => {
        expect(toPublicCabinetImageAsset(
            '/uploads/cabinets/a0000000-0000-4000-8000-000000000001.jpg',
            storedManifest,
        )).toEqual({
            original: {
                url: '/uploads/cabinets/a0000000-0000-4000-8000-000000000001.jpg',
                contentType: 'image/jpeg',
                bytes: 42,
                width: 1600,
                height: 1200,
                checksum: 'a'.repeat(64),
                version: 'a'.repeat(64),
            },
            fallbackUrl: '/uploads/cabinets/a0000000-0000-4000-8000-000000000001.jpg',
            thumbnail: {
                url: '/uploads/cabinets/a0000000-0000-4000-8000-000000000001-thumb.webp',
                contentType: 'image/webp',
                bytes: 12,
                width: 640,
                height: 480,
                checksum: 'b'.repeat(64),
                version: 'a'.repeat(64),
            },
            preview: {
                url: '/uploads/cabinets/a0000000-0000-4000-8000-000000000001-preview.webp',
                contentType: 'image/webp',
                bytes: 24,
                width: 1280,
                height: 960,
                checksum: 'c'.repeat(64),
                version: 'a'.repeat(64),
            },
        })
    })

    it('keeps external and unregistered images original-only', () => {
        expect(toPublicCabinetImageAsset('/images/cabinets/mock.webp')).toEqual({
            original: {
                url: '/images/cabinets/mock.webp',
                contentType: null,
                bytes: null,
                width: null,
                height: null,
                checksum: null,
                version: null,
            },
            fallbackUrl: '/images/cabinets/mock.webp',
        })
    })
})
