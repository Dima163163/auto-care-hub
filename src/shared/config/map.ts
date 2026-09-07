import { readPublicEnv } from './runtime-env'

export const FALLBACK_MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DEFAULT_MAP_TILE_URL = FALLBACK_MAP_TILE_URL
const DEFAULT_RESULTS_MAP_TILE_URL = FALLBACK_MAP_TILE_URL
const DEFAULT_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

export function getMapTileFallback(tileUrl: string) {
    return tileUrl === FALLBACK_MAP_TILE_URL ? null : FALLBACK_MAP_TILE_URL
}

export const MAP_CONFIG = {
    tileUrl: readPublicEnv('VITE_MAP_TILE_URL') ?? DEFAULT_MAP_TILE_URL,
    attribution: readPublicEnv('VITE_MAP_ATTRIBUTION') ?? DEFAULT_MAP_ATTRIBUTION,
    subdomains: ['a', 'b', 'c'],
}

export const RESULTS_MAP_CONFIG = {
    ...MAP_CONFIG,
    tileUrl: readPublicEnv('VITE_RESULTS_MAP_TILE_URL') ?? DEFAULT_RESULTS_MAP_TILE_URL,
}
