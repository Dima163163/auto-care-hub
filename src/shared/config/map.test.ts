import { describe, expect, it } from 'vitest'

import { FALLBACK_MAP_TILE_URL, getMapTileFallback, MAP_CONFIG, RESULTS_MAP_CONFIG } from './map'

describe('map tile fallback policy', () => {
    it('uses keyless OpenStreetMap tiles by default', () => {
        expect(MAP_CONFIG.tileUrl).toBe(FALLBACK_MAP_TILE_URL)
        expect(RESULTS_MAP_CONFIG.tileUrl).toBe(FALLBACK_MAP_TILE_URL)
        expect(MAP_CONFIG.subdomains).toEqual(['a', 'b', 'c'])
        expect(MAP_CONFIG.attribution).toContain('OpenStreetMap')
        expect(MAP_CONFIG.attribution).toContain('openstreetmap.org/copyright')
    })

    it('falls back to the keyless OpenStreetMap template for a custom provider', () => {
        expect(getMapTileFallback('https://tiles.example.test/{z}/{x}/{y}.png')).toBe(FALLBACK_MAP_TILE_URL)
    })

    it('does not loop when the keyless fallback itself fails', () => {
        expect(getMapTileFallback(FALLBACK_MAP_TILE_URL)).toBeNull()
    })
})
