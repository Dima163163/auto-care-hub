import { describe, expect, it } from 'vitest'

import { getDiscoverySlot } from './autocare-discovery.js'

const location = {
    timezone: 'Europe/Samara',
    hours: 'Пн–Вс: 09:00–21:00',
    weeklySchedule: null,
    blackoutDates: [],
}

describe('AutoCare discovery availability', () => {
    it('marks a location open today without inventing an available booking slot', () => {
        const result = getDiscoverySlot(location, { timezone: 'Europe/Samara' }, new Date('2026-08-21T06:00:00.000Z'))

        expect(result).toEqual({ availableToday: true, nextSlot: null })
    })

    it('excludes a location after its closing time', () => {
        const result = getDiscoverySlot(location, { timezone: 'Europe/Samara' }, new Date('2026-08-21T18:30:00.000Z'))

        expect(result).toEqual({ availableToday: false, nextSlot: null })
    })

    it('excludes a location on a blackout date even when its weekly schedule is open', () => {
        const result = getDiscoverySlot({ ...location, blackoutDates: ['2026-08-21'] }, { timezone: 'Europe/Samara' }, new Date('2026-08-21T06:00:00.000Z'))

        expect(result).toEqual({ availableToday: false, nextSlot: null })
    })

    it('does not call the exact closing time available today', () => {
        const result = getDiscoverySlot(location, { timezone: 'Europe/Samara' }, new Date('2026-08-21T17:00:00.000Z'))

        expect(result).toEqual({ availableToday: false, nextSlot: null })
    })

    it('respects a closed weekly schedule', () => {
        const result = getDiscoverySlot({ ...location, weeklySchedule: { fri: { open: '09:00', close: '21:00', closed: true } } }, null, new Date('2026-08-21T06:00:00.000Z'))

        expect(result.availableToday).toBe(false)
        expect(result.nextSlot).toBeNull()
    })
})
