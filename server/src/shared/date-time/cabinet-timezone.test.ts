import { describe, expect, it } from 'vitest'

import {
    addDays,
    getWeekday,
    getZonedDateTime,
    isValidTimeZone,
    zonedDateTimeToInstant,
} from './cabinet-timezone.js'

describe('cabinet timezone helpers', () => {
    it('uses the cabinet local date across a UTC date boundary', () => {
        const instant = new Date('2026-07-14T22:30:00.000Z')

        expect(getZonedDateTime('Europe/Chisinau', instant)).toEqual({
            date: '2026-07-15',
            minutes: 90,
        })
        expect(getZonedDateTime('UTC', instant)).toEqual({
            date: '2026-07-14',
            minutes: 22 * 60 + 30,
        })
    })

    it('handles calendar arithmetic and weekdays without server timezone state', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(getWeekday('2026-07-19')).toBe(0)
        expect(getWeekday('2026-07-20')).toBe(1)
    })

    it('validates IANA timezone identifiers', () => {
        expect(isValidTimeZone('Europe/Chisinau')).toBe(true)
        expect(isValidTimeZone('Not/A_Timezone')).toBe(false)
    })

    it('converts a cabinet local slot to an exact instant', () => {
        expect(zonedDateTimeToInstant(
            '2026-07-15',
            '01:30',
            'Europe/Chisinau',
        ).toISOString()).toBe('2026-07-14T22:30:00.000Z')
    })
})
