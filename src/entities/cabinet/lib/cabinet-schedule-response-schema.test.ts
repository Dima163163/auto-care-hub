import { describe, expect, it } from 'vitest'

import {
    normalizeCabinetBlockedPeriodsResponse,
    normalizeCabinetScheduleExceptionsResponse,
    normalizeCabinetScheduleResponse,
} from './cabinet-schedule-response-schema'

const schedule = {
    items: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        openTime: '08:00',
        closeTime: '22:00',
        isOpen: weekday > 0 && weekday < 6,
    })),
}

describe('cabinet schedule response schemas', () => {
    it('accepts valid schedule, exception, and blocked period responses', () => {
        expect(normalizeCabinetScheduleResponse(schedule).items).toHaveLength(7)
        expect(normalizeCabinetScheduleExceptionsResponse({
            items: [{
                date: '2026-08-01',
                openTime: null,
                closeTime: null,
                isClosed: true,
            }],
        }).items).toHaveLength(1)
        expect(normalizeCabinetBlockedPeriodsResponse({
            items: [{
                id: 'blocked-1',
                date: '2026-08-01',
                startTime: null,
                endTime: null,
                kind: 'holiday',
                reason: 'Holiday',
            }],
        }).items).toHaveLength(1)
    })

    it('rejects invalid ranges and malformed weekday collections', () => {
        expect(() => normalizeCabinetScheduleResponse({
            items: schedule.items.map((item, index) => index === 1
                ? { ...item, openTime: '22:00', closeTime: '08:00', isOpen: true }
                : item),
        })).toThrow()
        expect(() => normalizeCabinetScheduleResponse({ items: schedule.items.slice(0, 6) })).toThrow()
        expect(() => normalizeCabinetScheduleExceptionsResponse({
            items: [{ date: '2026-08-01', openTime: '18:00', closeTime: '10:00', isClosed: false }],
        })).toThrow()
        expect(() => normalizeCabinetBlockedPeriodsResponse({
            items: [{
                date: '2026-08-01',
                startTime: '10:00',
                endTime: '11:00',
                kind: 'holiday',
                reason: null,
            }],
        })).toThrow()
    })
})
