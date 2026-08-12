import { describe, expect, it } from 'vitest'

import {
    MAX_ORPHAN_IMAGE_SCAN,
    isOrphanImageEntryOlderThan,
    selectOrphanImageEntries,
} from './orphan-image-scan.js'

describe('orphan image scan bounds', () => {
    it('keeps scans bounded and preserves order', () => {
        expect(selectOrphanImageEntries([1, 2, 3], 2)).toEqual([1, 2])
        expect(selectOrphanImageEntries(Array.from({ length: MAX_ORPHAN_IMAGE_SCAN + 1 }, (_, i) => i))).toHaveLength(MAX_ORPHAN_IMAGE_SCAN)
    })

    it('rejects invalid scan limits', () => {
        expect(() => selectOrphanImageEntries([], 0)).toThrow()
        expect(() => selectOrphanImageEntries([], 1.5)).toThrow()
    })

    it('protects recent files with an explicit grace period', () => {
        expect(isOrphanImageEntryOlderThan(1_000, 10_000, 9_000)).toBe(true)
        expect(isOrphanImageEntryOlderThan(1_001, 10_000, 9_000)).toBe(false)
        expect(() => isOrphanImageEntryOlderThan(1, 2, -1)).toThrow()
    })
})
