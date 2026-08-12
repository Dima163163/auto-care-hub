import { describe, expect, it } from 'vitest'

import {
    createBookingCalendarUrl,
    createCabinetDirectionsUrl,
    createCabinetMapUrl,
} from './bookingSuccessLinks'

const booking = {
    cabinetTitle: 'Quiet Studio',
    address: 'Main Street 12',
    city: 'Chișinău',
    serviceTitle: 'Portrait session',
    date: '2026-08-12',
    startTime: '09:30',
    endTime: '10:30',
}

describe('booking success links', () => {
    it('creates a maps link from the visible cabinet location', () => {
        expect(createCabinetMapUrl(booking)).toBe(
            'https://www.google.com/maps/search/?api=1&query=Main%20Street%2012%2C%20Chi%C8%99in%C4%83u',
        )
    })

    it('keeps calendar dates, location, and booking context encoded', () => {
        const url = new URL(createBookingCalendarUrl(booking))

        expect(url.hostname).toBe('calendar.google.com')
        expect(url.searchParams.get('dates')).toBe('20260812T093000/20260812T103000')
        expect(url.searchParams.get('location')).toBe('Main Street 12, Chișinău')
        expect(url.searchParams.get('details')).toBe('Quiet Studio')
    })

    it('creates a directions link with a destination and no precise origin', () => {
        expect(createCabinetDirectionsUrl(booking)).toBe(
            'https://www.google.com/maps/dir/?api=1&destination=Main%20Street%2012%2C%20Chi%C8%99in%C4%83u',
        )
    })
})
