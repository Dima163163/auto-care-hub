import { describe, expect, it } from 'vitest'

import {
    getCabinetAvailabilityInvalidationTags,
    getCabinetReviewInvalidationTags,
} from './cache-tags'

describe('cabinet availability cache tags', () => {
    it('invalidates occupied slots and cabinet availability after a cabinet change', () => {
        expect(getCabinetAvailabilityInvalidationTags('cabinet-42')).toEqual([
            { type: 'Booking', id: 'OCCUPIED_SLOTS' },
            { type: 'Cabinet', id: 'cabinet-42' },
            { type: 'Cabinet', id: 'LIST' },
            { type: 'Cabinet', id: 'ALL_LIST' },
        ])
    })

    it('invalidates cabinet cards and details after a review change', () => {
        expect(getCabinetReviewInvalidationTags('cabinet-42')).toEqual([
            { type: 'Cabinet', id: 'cabinet-42' },
            { type: 'Cabinet', id: 'LIST' },
            { type: 'Cabinet', id: 'ALL_LIST' },
        ])
    })
})
