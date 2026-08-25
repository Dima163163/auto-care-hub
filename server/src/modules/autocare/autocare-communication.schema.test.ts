import { describe, expect, it } from 'vitest'

import { autoCareCommunicationSettingsSchema } from './autocare.schemas.js'

const base = {
    teamSize: 'solo' as const,
    businessType: 'private_master' as const,
    chatEnabled: true,
    communicationMode: 'online' as const,
    responseWindowMinutes: 120,
    responseHours: 'working_hours' as const,
    phoneBookingEnabled: true,
    callbackEnabled: true,
    requestPhotosEnabled: true,
    publicContactNote: null,
}

describe('auto care communication settings', () => {
    it('accepts a small online service with a response window', () => {
        expect(autoCareCommunicationSettingsSchema.parse(base).communicationMode).toBe('online')
    })

    it('accepts phone-only teams without a chat response promise', () => {
        const value = autoCareCommunicationSettingsSchema.parse({ ...base, chatEnabled: false, communicationMode: 'phone_only', responseWindowMinutes: null })
        expect(value.chatEnabled).toBe(false)
        expect(value.responseWindowMinutes).toBeNull()
    })

    it('rejects chat without a response window', () => {
        expect(() => autoCareCommunicationSettingsSchema.parse({ ...base, responseWindowMinutes: null })).toThrow()
    })

    it('rejects phone-only mode without phone booking', () => {
        expect(() => autoCareCommunicationSettingsSchema.parse({ ...base, chatEnabled: false, communicationMode: 'phone_only', responseWindowMinutes: null, phoneBookingEnabled: false })).toThrow()
    })

    it('rejects customer chat in phone-only mode', () => {
        expect(() => autoCareCommunicationSettingsSchema.parse({ ...base, communicationMode: 'phone_only' })).toThrow()
    })
})
