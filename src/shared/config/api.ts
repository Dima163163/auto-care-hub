const API_MODES = ['mock', 'real'] as const

import { isDevRuntime, readPublicEnv } from './runtime-env'

export type ApiMode = (typeof API_MODES)[number]

function getApiMode(): ApiMode {
    const value = readPublicEnv('VITE_API_MODE') ?? 'mock'

    if (API_MODES.includes(value as ApiMode)) {
        return value as ApiMode
    }

    return 'mock'
}

function getRealApiBaseUrl() {
    if (isDevRuntime()) {
        return '/api'
    }

    if (
        typeof window !== 'undefined' &&
        window.location.hostname.endsWith('.vercel.app')
    ) {
        return '/api'
    }

    return readPublicEnv('VITE_API_BASE_URL') ?? 'http://localhost:4000'
}

export const API_MODE = getApiMode()

export const IS_MOCK_API = API_MODE === 'mock'
export const IS_REAL_API = API_MODE === 'real'

export const API_BASE_URL = IS_REAL_API ? getRealApiBaseUrl() : '/api'
