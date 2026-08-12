import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
    CABINET_IMAGE_PREVIEW_WIDTH,
    createCabinetImagePreview,
    createCabinetImageThumbnail,
} from './cabinet-image-thumbnail.js'

describe('cabinet image thumbnails', () => {
    it('creates a bounded webp thumbnail', async () => {
        const source = await sharp({
            create: {
                width: 1_000,
                height: 700,
                channels: 3,
                background: 'white',
            },
        }).png().toBuffer()

        const thumbnail = await createCabinetImageThumbnail(source)
        const metadata = await sharp(thumbnail).metadata()

        expect(metadata.format).toBe('webp')
        expect(metadata.width).toBeLessThanOrEqual(640)
        expect(metadata.height).toBeLessThanOrEqual(480)
    })

    it('creates a bounded webp preview variant', async () => {
        const source = await sharp({
            create: {
                width: 2_000,
                height: 1_500,
                channels: 3,
                background: '#ffffff',
            },
        }).png().toBuffer()

        const preview = await createCabinetImagePreview(source)
        const metadata = await sharp(preview).metadata()

        expect(metadata.format).toBe('webp')
        expect(metadata.width).toBeLessThanOrEqual(CABINET_IMAGE_PREVIEW_WIDTH)
    })
})
