import { describe, expect, it } from 'vitest'

import {
    getAvailabilityQueryLimits,
    MAX_AVAILABLE_TODAY_CANDIDATES,
    MAX_AVAILABILITY_BOOKINGS,
} from './availability-query-policy.js'

describe('availability query policy', () => {
    it('exposes finite limits for each supporting query', () => {
        expect(getAvailabilityQueryLimits()).toMatchObject({
            candidates: MAX_AVAILABLE_TODAY_CANDIDATES,
            bookings: MAX_AVAILABILITY_BOOKINGS,
        })
    })
})
