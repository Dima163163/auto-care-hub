import { describe, expect, it } from 'vitest'

import { getCabinetImageSources } from './getCabinetImageSources'

describe('getCabinetImageSources', () => {
    it('does not guess variant filenames when the API has no manifest', () => {
        expect(getCabinetImageSources('/uploads/cabinets/a0000000-0000-4000-8000-000000000001.jpg'))
            .toEqual({
                src: '/api/uploads/cabinets/a0000000-0000-4000-8000-000000000001.jpg',
                srcSet: undefined,
            })
    })

    it('prefers explicit server-provided media variants', () => {
        expect(getCabinetImageSources('/uploads/cabinets/image.jpg', [{
            original: {
                url: '/uploads/cabinets/image.jpg',
                contentType: 'image/jpeg',
                bytes: 42,
                width: 1600,
                height: 1200,
                checksum: null,
                version: 'image-v1',
            },
            fallbackUrl: '/uploads/cabinets/image.jpg',
            thumbnail: {
                url: '/uploads/cabinets/image-thumb.webp',
                contentType: 'image/webp',
                bytes: 12,
                width: 480,
                height: 360,
                checksum: 'a'.repeat(64),
                version: 'image-v1',
            },
            preview: {
                url: '/uploads/cabinets/image-preview.webp',
                contentType: 'image/webp',
                bytes: 24,
                width: 960,
                height: 720,
                checksum: 'b'.repeat(64),
                version: 'image-v1',
            },
        }])).toEqual({
            src: '/api/uploads/cabinets/image.jpg',
            srcSet: '/api/uploads/cabinets/image-thumb.webp 480w, /api/uploads/cabinets/image-preview.webp 960w',
        })
    })

    it('does not invent a missing explicit variant', () => {
        expect(getCabinetImageSources('/uploads/cabinets/image.jpg', [{
            original: {
                url: '/uploads/cabinets/image.jpg',
                contentType: 'image/jpeg',
                bytes: 42,
                width: 1600,
                height: 1200,
                checksum: null,
                version: 'image-v1',
            },
            fallbackUrl: '/uploads/cabinets/image.jpg',
            thumbnail: {
                url: '/uploads/cabinets/image-thumb.webp',
                contentType: 'image/webp',
                bytes: 12,
                width: 480,
                height: 360,
                checksum: 'a'.repeat(64),
                version: 'image-v1',
            },
        }])).toEqual({
            src: '/api/uploads/cabinets/image.jpg',
            srcSet: '/api/uploads/cabinets/image-thumb.webp 480w',
        })
    })

    it('does not invent variants for local or external imagery', () => {
        expect(getCabinetImageSources('/images/cabinets/mock.webp')).toEqual({
            src: '/images/cabinets/mock.webp',
            srcSet: undefined,
        })
        expect(getCabinetImageSources('https://cdn.example.com/cabinet.webp')).toEqual({
            src: 'https://cdn.example.com/cabinet.webp',
            srcSet: undefined,
        })
    })
})
