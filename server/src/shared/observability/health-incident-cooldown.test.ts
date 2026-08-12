import { describe, expect, it } from 'vitest'

import { shouldEmitHealthIncident } from './health-incident-cooldown.js'

describe('health incident cooldown', () => {
    it('emits the first incident and suppresses repeats in the window', () => {
        expect(shouldEmitHealthIncident(null, 100_000, 5_000)).toBe(true)
        expect(shouldEmitHealthIncident(99_000, 100_000, 5_000)).toBe(false)
        expect(shouldEmitHealthIncident(95_000, 100_000, 5_000)).toBe(true)
    })

    it('rejects invalid clock state', () => {
        expect(shouldEmitHealthIncident(101_000, 100_000, 5_000)).toBe(false)
        expect(shouldEmitHealthIncident(null, 100_000, 0)).toBe(false)
    })
})
