import { describe, expect, it } from 'vitest'

import {
    normalizeRuntimeMode,
    shouldStartApi,
    shouldStartWorker,
} from './runtime-mode-policy.js'

describe('runtime mode policy', () => {
    it('defaults to the combined local mode and accepts explicit ownership', () => {
        expect(normalizeRuntimeMode(undefined)).toBe('all')
        expect(normalizeRuntimeMode(' API ')).toBe('api')
        expect(normalizeRuntimeMode('worker')).toBe('worker')
        expect(shouldStartApi('api')).toBe(true)
        expect(shouldStartApi('worker')).toBe(false)
        expect(shouldStartWorker('worker')).toBe(true)
        expect(shouldStartWorker('api')).toBe(false)
    })

    it('rejects an unknown runtime mode', () => {
        expect(() => normalizeRuntimeMode('cron')).toThrow(/RUNTIME_MODE/)
    })
})
