import { describe, expect, it } from 'vitest'

import { getProviderContactPresentation, getProviderDateInputValue, isProviderDateAvailable } from './providerAvailability'

const provider = {
    weeklySchedule: {
        mon: { open: '08:00', close: '21:00', closed: false },
        tue: { open: '08:00', close: '21:00', closed: true },
    },
    blackoutDates: ['2026-08-26'],
}

describe('provider availability presentation', () => {
    it('disables closed weekdays and explicit blackout dates', () => {
        expect(isProviderDateAvailable('2026-08-24', provider)).toBe(true)
        expect(isProviderDateAvailable('2026-08-25', provider)).toBe(false)
        expect(isProviderDateAvailable('2026-08-26', provider)).toBe(false)
    })

    it('keeps all communication modes explicit for the public page', () => {
        expect(getProviderContactPresentation({ communicationMode: 'online', chatEnabled: true })).toMatchObject({ usesOnlineSlots: true, allowsRequest: true, requiresPhone: false, showChat: true })
        expect(getProviderContactPresentation({ communicationMode: 'request_then_confirm', chatEnabled: false })).toMatchObject({ usesOnlineSlots: false, allowsRequest: true, requiresPhone: true, showChat: false })
        expect(getProviderContactPresentation({ communicationMode: 'phone_only', chatEnabled: true })).toMatchObject({ usesOnlineSlots: false, allowsRequest: false, requiresPhone: true, showChat: false })
    })

    it('returns a service-local date even when timezone data is invalid', () => {
        expect(getProviderDateInputValue(0, 'Europe/Moscow')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(getProviderDateInputValue(1, 'not/a-timezone')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
})
