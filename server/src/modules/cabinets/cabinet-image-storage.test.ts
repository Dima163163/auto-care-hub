import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
    assertSafeImageFileName,
    createCabinetImageManifestFromOriginal,
    createStoredCabinetImageManifest,
    getRemovedUploadedCabinetImages,
    getUploadedCabinetImageFileName,
    putCabinetImageObjects,
} from './cabinet-image-storage'

describe('cabinet image storage', () => {
    it('builds a complete manifest for a legacy original without rewriting it', async () => {
        const original = await sharp({
            create: { width: 800, height: 600, channels: 3, background: 'white' },
        }).jpeg().toBuffer()

        const result = await createCabinetImageManifestFromOriginal({
            originalKey: 'a0000000-0000-4000-8000-000000000002.jpg',
            originalContentType: 'image/jpeg',
            originalContent: original,
        })

        expect(result.storedManifest.original.bytes).toBe(original.length)
        expect(result.storedManifest.original.contentType).toBe('image/jpeg')
        expect(result.storedManifest.variants.thumbnail.key).toContain('-thumb.webp')
        expect(result.storedManifest.variants.preview.key).toContain('-preview.webp')
        expect(result.thumbnail.length).toBeGreaterThan(0)
        expect(result.preview.length).toBeGreaterThan(0)
    })

    it('records actual dimensions, checksums, and bytes for every manifest variant', async () => {
        const original = await sharp({
            create: { width: 1600, height: 1200, channels: 3, background: 'white' },
        }).jpeg().toBuffer()
        const thumbnail = await sharp(original)
            .resize({ width: 640, height: 480, fit: 'inside' })
            .webp()
            .toBuffer()
        const preview = await sharp(original)
            .resize({ width: 1280, height: 960, fit: 'inside' })
            .webp()
            .toBuffer()

        const manifest = await createStoredCabinetImageManifest({
            originalKey: 'a0000000-0000-4000-8000-000000000001.jpg',
            originalContentType: 'image/jpeg',
            originalContent: original,
            thumbnailKey: 'a0000000-0000-4000-8000-000000000001-thumb.webp',
            thumbnailContent: thumbnail,
            previewKey: 'a0000000-0000-4000-8000-000000000001-preview.webp',
            previewContent: preview,
        })

        expect(manifest.original.width).toBe(1600)
        expect(manifest.original.height).toBe(1200)
        expect(manifest.original.bytes).toBe(original.length)
        expect(manifest.original.checksum).toHaveLength(64)
        expect(manifest.variants.thumbnail.width).toBe(640)
        expect(manifest.variants.preview.width).toBe(1280)
        expect(manifest.variants.thumbnail.checksum).toHaveLength(64)
    })

    it('extracts file names only from owned uploaded cabinet image URLs', () => {
        expect(
            getUploadedCabinetImageFileName(
                '/uploads/cabinets/123e4567-e89b-12d3-a456-426614174000.webp'
            )
        ).toBe('123e4567-e89b-12d3-a456-426614174000.webp')

        expect(
            getUploadedCabinetImageFileName('/images/cabinets/mock.webp')
        ).toBeUndefined()
        expect(
            getUploadedCabinetImageFileName('https://example.com/cabinet.webp')
        ).toBeUndefined()
        expect(
            getUploadedCabinetImageFileName('/uploads/cabinets/../secret.webp')
        ).toBeUndefined()
    })

    it('returns only uploaded images removed from the next photo list', () => {
        const keptImage =
            '/uploads/cabinets/123e4567-e89b-12d3-a456-426614174000.webp'
        const removedImage =
            '/uploads/cabinets/223e4567-e89b-12d3-a456-426614174000.jpg'
        const publicImage = '/images/cabinets/mock.webp'

        expect(
            getRemovedUploadedCabinetImages(
                [keptImage, removedImage, publicImage],
                [keptImage, '/uploads/cabinets/323e4567-e89b-12d3-a456-426614174000.png']
            )
        ).toEqual([removedImage])
    })

    it('rejects traversal, absolute paths, and unsupported extensions', () => {
        expect(() => assertSafeImageFileName('../secret.webp')).toThrow()
        expect(() => assertSafeImageFileName('/tmp/secret.webp')).toThrow()
        expect(() => assertSafeImageFileName('123e4567-e89b-12d3-a456-426614174000.svg')).toThrow()
        expect(() => assertSafeImageFileName('123E4567-E89B-12D3-A456-426614174000.webp')).toThrow()
    })

    it('rolls back all objects when one variant upload fails', async () => {
        const removedKeys: string[] = []
        const storage = {
            put: async (key: string) => {
                if (key === 'image-preview.webp') throw new Error('storage unavailable')
            },
            remove: async (key: string) => {
                removedKeys.push(key)
            },
        }

        await expect(putCabinetImageObjects(storage, [
            { key: 'image.webp', content: Buffer.from('original') },
            { key: 'image-thumb.webp', content: Buffer.from('thumbnail') },
            { key: 'image-preview.webp', content: Buffer.from('preview') },
        ])).rejects.toThrow('storage unavailable')

        expect(removedKeys).toEqual([
            'image.webp',
            'image-thumb.webp',
            'image-preview.webp',
        ])
    })
})
