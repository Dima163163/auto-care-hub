import { describe, expect, it } from 'vitest'

import {
    countOverlappingCapacityReservations,
    hasAvailableAppointmentCapacity,
    normalizeAppointmentCapacity,
} from './capacity-reservation.js'

describe('AutoCare capacity reservations', () => {
    it('normalizes legacy locations to one reservable workstation', () => {
        expect(normalizeAppointmentCapacity(undefined)).toBe(1)
        expect(normalizeAppointmentCapacity(0)).toBe(1)
        expect(normalizeAppointmentCapacity(3)).toBe(3)
    })

    it('counts only intervals that overlap the proposed visit', () => {
        const candidate = { startsAtMinutes: 10 * 60, durationMinutes: 60 }
        const reservations = [
            { startsAtMinutes: 9 * 60, durationMinutes: 90 },
            { startsAtMinutes: 10 * 60 + 30, durationMinutes: 30 },
            { startsAtMinutes: 11 * 60, durationMinutes: 30 },
        ]

        expect(countOverlappingCapacityReservations(candidate, reservations)).toBe(2)
        expect(hasAvailableAppointmentCapacity({ capacity: 2, candidate, reservations })).toBe(false)
        expect(hasAvailableAppointmentCapacity({ capacity: 3, candidate, reservations })).toBe(true)
    })
})
