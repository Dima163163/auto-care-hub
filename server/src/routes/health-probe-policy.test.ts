import { describe, expect, it } from 'vitest'

import { assertHealthProbeTimeout } from './health-probe-policy.js'

describe('health probe timeout policy', () => {
    it('accepts bounded probe timeouts', () => {
        expect(assertHealthProbeTimeout(5_000)).toBe(5_000)
        expect(assertHealthProbeTimeout(120_000)).toBe(120_000)
    })

    it('rejects unsafe probe timeouts', () => {
        expect(() => assertHealthProbeTimeout(0)).toThrow(/invalid/)
        expect(() => assertHealthProbeTimeout(120_001)).toThrow(/invalid/)
    })
})
