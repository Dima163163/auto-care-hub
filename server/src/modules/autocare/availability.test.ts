import { describe, expect, it } from 'vitest'

import { getScheduleForDate, isValidTimeZone, localDateRangeToUtc, localDateTimeParts, zonedWallTimeToUtc } from './availability.js'

describe('AutoCare availability timezone helpers', () => {
    it('converts a service-local wall time to UTC', () => {
        expect(zonedWallTimeToUtc('2026-08-15', '10:00', 'Europe/Samara')?.toISOString()).toBe('2026-08-15T06:00:00.000Z')
    })

    it('returns a complete UTC range for a local calendar day', () => {
        const range = localDateRangeToUtc('2026-08-15', 'Europe/Moscow')
        expect(range?.start.toISOString()).toBe('2026-08-14T21:00:00.000Z')
        expect(range?.end.toISOString()).toBe('2026-08-15T20:59:59.999Z')
    })

    it('keeps local date and minutes across a timezone boundary', () => {
        const instant = new Date('2026-08-15T20:30:00.000Z')
        expect(localDateTimeParts(instant, 'Europe/Moscow')).toEqual({ date: '2026-08-15', minutes: 23 * 60 + 30 })
    })

    it('prefers a configured weekday and falls back to the legacy hours text', () => {
        const configured = getScheduleForDate('2026-08-17', 'Пн–Вс: 08:00–21:00', {
            mon: { open: '10:00', close: '18:00', closed: false },
        })
        expect(configured).toEqual({ open: '10:00', close: '18:00', closed: false })
        expect(getScheduleForDate('2026-08-18', 'Пн–Вс: 08:00–21:00', undefined)).toEqual({ open: '08:00', close: '21:00', closed: false })
    })

    it('rejects unknown timezones before availability is calculated', () => {
        expect(isValidTimeZone('Europe/Moscow')).toBe(true)
        expect(isValidTimeZone('Not/AZone')).toBe(false)
    })
})
