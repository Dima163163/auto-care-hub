import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { readCabinetImageDimensions } from './cabinet-image-dimensions.js'

describe('cabinet image dimensions', () => {
    it('reads dimensions from decoded image content', async () => {
        const content = await sharp({
            create: {
                width: 320,
                height: 180,
                channels: 3,
                background: 'black',
            },
        }).png().toBuffer()

        await expect(readCabinetImageDimensions(content)).resolves.toEqual({ width: 320, height: 180 })
    })

    it('rejects non-image content', async () => {
        await expect(readCabinetImageDimensions(Buffer.from('not-an-image'))).rejects.toThrow()
    })
})
