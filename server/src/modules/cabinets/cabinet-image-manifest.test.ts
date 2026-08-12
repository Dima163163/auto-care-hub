import { describe, expect, it } from 'vitest'

import {
    getCabinetImageManifest,
    parseStoredCabinetImageManifest,
} from './cabinet-image-manifest.js'

describe('cabinet image manifest', () => {
    it('lists original and derived object keys', () => {
        expect(getCabinetImageManifest('a0000000-0000-4000-8000-000000000001.webp')).toEqual({
            originalKey: 'a0000000-0000-4000-8000-000000000001.webp',
            version: 'a0000000-0000-4000-8000-000000000001.webp',
            variants: {
                thumbnail: 'a0000000-0000-4000-8000-000000000001-thumb.webp',
                preview: 'a0000000-0000-4000-8000-000000000001-preview.webp',
            },
        })
    })

    it('rejects manifests that could emit unrelated or unsafe object URLs', () => {
        const manifest = {
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
                    key: 'other-file-thumb.webp',
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

        expect(parseStoredCabinetImageManifest(manifest)).toBeNull()
    })

    it('accepts a complete manifest and preserves its metadata', () => {
        const key = 'a0000000-0000-4000-8000-000000000001.webp'
        const manifest = {
            originalKey: key,
            version: 'a'.repeat(64),
            original: {
                key,
                contentType: 'image/webp',
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

        expect(parseStoredCabinetImageManifest(manifest)).toEqual(manifest)
    })
})
