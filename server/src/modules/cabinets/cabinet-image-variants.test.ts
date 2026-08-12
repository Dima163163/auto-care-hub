import { describe, expect, it } from 'vitest'

import { getCabinetImageVariantKey } from './cabinet-image-variants.js'

describe('cabinet image variants', () => {
    const original = 'a0000000-0000-4000-8000-000000000001.webp'

    it('maps supported variants to deterministic keys', () => {
        expect(getCabinetImageVariantKey(original, 'thumbnail')).toBe('a0000000-0000-4000-8000-000000000001-thumb.webp')
        expect(getCabinetImageVariantKey(original, 'preview')).toBe('a0000000-0000-4000-8000-000000000001-preview.webp')
    })

    it('uses the encoded WebP format for JPEG and PNG originals', () => {
        expect(getCabinetImageVariantKey('a0000000-0000-4000-8000-000000000001.jpg', 'thumbnail'))
            .toBe('a0000000-0000-4000-8000-000000000001-thumb.webp')
        expect(getCabinetImageVariantKey('a0000000-0000-4000-8000-000000000001.png', 'preview'))
            .toBe('a0000000-0000-4000-8000-000000000001-preview.webp')
    })

    it('rejects unsafe original keys before constructing a variant', () => {
        expect(() => getCabinetImageVariantKey('../image.webp', 'thumbnail')).toThrow()
    })
})
