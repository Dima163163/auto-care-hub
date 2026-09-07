import { describe, expect, it } from 'vitest'

import { FALLBACK_MAP_TILE_URL, getMapTileFallback } from './map'

describe('map tile fallback policy', () => {
    it('falls back to the keyless OpenStreetMap template for a custom provider', () => {
        expect(getMapTileFallback('https://tiles.example.test/{z}/{x}/{y}.png')).toBe(FALLBACK_MAP_TILE_URL)
    })

    it('does not loop when the keyless fallback itself fails', () => {
        expect(getMapTileFallback(FALLBACK_MAP_TILE_URL)).toBeNull()
    })
})
