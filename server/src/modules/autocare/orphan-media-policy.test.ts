import { describe, expect, it } from 'vitest'

import { selectOrphanAutoCareMedia } from './orphan-media-policy.js'

describe('selectOrphanAutoCareMedia', () => {
    it('keeps referenced and recent files', () => {
        expect(selectOrphanAutoCareMedia({
            entries: [
                { fileName: 'used.webp', lastModifiedAt: 0 },
                { fileName: 'recent.webp', lastModifiedAt: 9_500 },
                { fileName: 'orphan.webp', lastModifiedAt: 0 },
            ],
            referencedFileNames: new Set(['used.webp']),
            now: 10_000,
            gracePeriodMs: 2_000,
        })).toEqual([{ fileName: 'orphan.webp', lastModifiedAt: 0 }])
    })

    it('bounds each cleanup batch', () => {
        const entries = Array.from({ length: 250 }, (_, index) => ({ fileName: `${index}.webp`, lastModifiedAt: 0 }))
        expect(selectOrphanAutoCareMedia({
            entries,
            referencedFileNames: new Set(),
            now: 10_000,
            gracePeriodMs: 1,
        })).toHaveLength(200)
    })
})
