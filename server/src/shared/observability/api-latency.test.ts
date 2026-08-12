import { describe, expect, it } from 'vitest'

import {
    getBoundedApiLatencyMs,
    MAX_API_LATENCY_MS,
} from './api-latency.js'

describe('API latency bounds', () => {
    it('clamps negative, normal, and runaway durations', () => {
        expect(getBoundedApiLatencyMs(100, 90)).toBe(0)
        expect(getBoundedApiLatencyMs(100, 250)).toBe(150)
        expect(getBoundedApiLatencyMs(0, MAX_API_LATENCY_MS * 2)).toBe(MAX_API_LATENCY_MS)
    })

    it('returns zero for invalid timestamps', () => {
        expect(getBoundedApiLatencyMs(Number.NaN, 100)).toBe(0)
        expect(getBoundedApiLatencyMs(100, Number.POSITIVE_INFINITY)).toBe(0)
    })
})
