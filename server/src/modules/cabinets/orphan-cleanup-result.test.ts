import { describe, expect, it } from 'vitest'

import { normalizeOrphanCleanupResult } from './orphan-cleanup-result.js'

describe('orphan cleanup result guard', () => {
    it('accepts consistent bounded counters', () => {
        expect(normalizeOrphanCleanupResult({ scanned: 5, removed: 4, failed: 1 })).toEqual({ scanned: 5, removed: 4, failed: 1 })
    })

    it('rejects impossible counters', () => {
        expect(() => normalizeOrphanCleanupResult({ scanned: 1, removed: 2, failed: 0 })).toThrow()
        expect(() => normalizeOrphanCleanupResult({ scanned: -1, removed: 0, failed: 0 })).toThrow()
    })
})
