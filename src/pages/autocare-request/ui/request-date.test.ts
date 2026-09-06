import { describe, expect, it } from 'vitest'

import { formatRequestDate, formatRequestLongDate, getRequestDateInputValue, parseRequestDate } from './request-date'

describe('request date policy', () => {
    it('accepts canonical real dates, including leap days', () => {
        expect(parseRequestDate(' 2024-02-29 ')).toBe('2024-02-29')
        expect(parseRequestDate('2026-09-05')).toBe('2026-09-05')
    })

    it('rejects malformed, impossible and unbounded dates before formatting', () => {
        expect(parseRequestDate('garbage')).toBeNull()
        expect(parseRequestDate('2026-02-29')).toBeNull()
        expect(parseRequestDate('2101-01-01')).toBeNull()
        expect(parseRequestDate('1999-12-31')).toBeNull()
        expect(formatRequestDate('garbage', 'en-US')).toBe('')
        expect(formatRequestLongDate('2026-02-30', 'en-US')).toBe('')
    })

    it('derives calendar dates in the service timezone, not the browser timezone', () => {
        const instant = new Date('2026-03-29T22:30:00.000Z')
        expect(getRequestDateInputValue(0, 'Europe/Moscow', instant)).toBe('2026-03-30')
        expect(getRequestDateInputValue(0, 'America/New_York', instant)).toBe('2026-03-29')
    })

    it('keeps the service date stable across a DST boundary', () => {
        const beforeSpringForward = new Date('2026-03-08T06:30:00.000Z')
        const afterSpringForward = new Date('2026-03-08T07:30:00.000Z')

        expect(getRequestDateInputValue(0, 'America/New_York', beforeSpringForward)).toBe('2026-03-08')
        expect(getRequestDateInputValue(0, 'America/New_York', afterSpringForward)).toBe('2026-03-08')
        expect(getRequestDateInputValue(1, 'America/New_York', afterSpringForward)).toBe('2026-03-09')
    })

    it('rolls the service date at local midnight instead of UTC midnight', () => {
        const afterMoscowMidnight = new Date('2026-01-01T21:00:00.000Z')

        expect(getRequestDateInputValue(0, 'Europe/Moscow', afterMoscowMidnight)).toBe('2026-01-02')
        expect(getRequestDateInputValue(1, 'Europe/Moscow', afterMoscowMidnight)).toBe('2026-01-03')
    })
})
