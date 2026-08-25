import { readPublicEnv } from './runtime-env'

const DEFAULT_MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DEFAULT_RESULTS_MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DEFAULT_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

export const MAP_CONFIG = {
    tileUrl: readPublicEnv('VITE_MAP_TILE_URL') ?? DEFAULT_MAP_TILE_URL,
    attribution: readPublicEnv('VITE_MAP_ATTRIBUTION') ?? DEFAULT_MAP_ATTRIBUTION,
    subdomains: ['a', 'b', 'c', 'd'],
}

export const RESULTS_MAP_CONFIG = {
    ...MAP_CONFIG,
    tileUrl: readPublicEnv('VITE_RESULTS_MAP_TILE_URL') ?? DEFAULT_RESULTS_MAP_TILE_URL,
}
