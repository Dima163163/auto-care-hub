import { describe, expect, it } from 'vitest'

import { parseHealthThreshold } from './health-thresholds.js'

describe('health threshold parser', () => {
    it('uses bounded defaults and valid overrides', () => {
        expect(parseHealthThreshold(undefined, 10, 100)).toBe(10)
        expect(parseHealthThreshold('25', 10, 100)).toBe(25)
    })

    it('rejects negative, fractional, and oversized values', () => {
        expect(() => parseHealthThreshold('-1', 10, 100)).toThrow()
        expect(() => parseHealthThreshold('1.5', 10, 100)).toThrow()
        expect(() => parseHealthThreshold('101', 10, 100)).toThrow()
    })
})
