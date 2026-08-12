import { describe, expect, it } from 'vitest'

import { buildCabinetImageCdnUrl } from './cabinet-image-cdn.js'

describe('cabinet image CDN URLs', () => {
    const key = 'a0000000-0000-4000-8000-000000000001.webp'

    it('builds an origin-safe URL for original and variant objects', () => {
        expect(buildCabinetImageCdnUrl({ origin: 'https://cdn.example.com', key })).toBe(
            'https://cdn.example.com/uploads/cabinets/a0000000-0000-4000-8000-000000000001.webp',
        )
        expect(buildCabinetImageCdnUrl({ origin: 'https://cdn.example.com/', key, variant: 'thumbnail' })).toContain('-thumb.webp')
    })

    it('rejects unsafe origins and keys', () => {
        expect(() => buildCabinetImageCdnUrl({ origin: 'javascript:alert(1)', key })).toThrow()
        expect(() => buildCabinetImageCdnUrl({ origin: 'https://cdn.example.com', key: '../image.webp' })).toThrow()
    })
})
