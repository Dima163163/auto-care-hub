import { describe, expect, it } from 'vitest'

import { mockCabinets } from './cabinets'

describe('mock cabinet imagery', () => {
    it('uses local inspectable assets for every cabinet photo', () => {
        const photos = mockCabinets.flatMap((cabinet) => cabinet.photos)

        expect(photos.length).toBeGreaterThan(0)
        expect(photos.every((photo) => photo.startsWith('/images/cabinets/'))).toBe(true)
        expect(photos.some((photo) => photo.includes('picsum.photos'))).toBe(false)
    })
})
