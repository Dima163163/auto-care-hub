import { describe, expect, it } from 'vitest'

import { isTimeRangeBlocked } from './cabinet-blocked-period.js'

describe('cabinet blocked periods', () => {
    it('blocks overlapping intervals but keeps adjacent slots available', () => {
        const periods = [{ startTime: '10:30:00', endTime: '11:30:00' }]

        expect(isTimeRangeBlocked('10:00', '11:00', periods)).toBe(true)
        expect(isTimeRangeBlocked('09:30', '10:30', periods)).toBe(false)
        expect(isTimeRangeBlocked('11:30', '12:30', periods)).toBe(false)
    })

    it('treats an all-day holiday as unavailable for every slot', () => {
        expect(isTimeRangeBlocked('08:00', '09:00', [{
            startTime: null,
            endTime: null,
        }])).toBe(true)
    })
})
