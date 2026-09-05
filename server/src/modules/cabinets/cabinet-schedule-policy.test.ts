import { describe, expect, it } from 'vitest'

import { blockedPeriodsSchema, exceptionsSchema, scheduleSchema } from './cabinet-schedule-policy.js'

const validSchedule = {
    items: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        openTime: '09:00',
        closeTime: '18:00',
        isOpen: true,
    })),
}

describe('cabinet schedule input policy', () => {
    it('requires one entry for every weekday', () => {
        expect(scheduleSchema.parse(validSchedule).items).toHaveLength(7)
        expect(() => scheduleSchema.parse({
            items: validSchedule.items.map((item, index) => ({ ...item, weekday: index === 6 ? 5 : item.weekday })),
        })).toThrow('exactly one schedule entry per weekday')
    })

    it('rejects impossible calendar dates and duplicate exceptions', () => {
        expect(() => exceptionsSchema.parse({ items: [{ date: '2026-02-30', openTime: null, closeTime: null, isClosed: true }] })).toThrow()
        expect(() => exceptionsSchema.parse({ items: [
            { date: '2026-08-01', openTime: null, closeTime: null, isClosed: true },
            { date: '2026-08-01', openTime: '09:00', closeTime: '10:00', isClosed: false },
        ] })).toThrow('at most one exception per date')
    })

    it('rejects impossible blocked-period dates before persistence', () => {
        expect(() => blockedPeriodsSchema.parse({ items: [{ date: '2026-13-01', startTime: null, endTime: null, kind: 'holiday', reason: null }] })).toThrow()
    })
})
