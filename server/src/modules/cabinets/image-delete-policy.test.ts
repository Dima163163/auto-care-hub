import { describe, expect, it } from 'vitest'

import { boundCabinetImageDeleteBatch } from './image-delete-policy.js'

describe('cabinet image delete policy', () => {
    it('deduplicates a bounded delete batch', () => {
        expect(boundCabinetImageDeleteBatch(['a.jpg', 'a.jpg', 'b.jpg'])).toEqual(['a.jpg', 'b.jpg'])
    })

    it('rejects oversized delete batches', () => {
        expect(() => boundCabinetImageDeleteBatch(Array.from({ length: 101 }, (_, index) => `${index}.jpg`)))
            .toThrow(/too large/)
    })
})
