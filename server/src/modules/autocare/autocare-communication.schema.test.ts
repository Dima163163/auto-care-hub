import { describe, expect, it } from 'vitest'

import { autoCareCommunicationSettingsSchema, ownerAutoCareProviderSchema } from './autocare.schemas.js'

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

    it('applies the same communication rules when a provider is created', () => {
        const provider = {
            ...base,
            name: 'Small Garage',
            marketId: '00000000-0000-4000-8000-000000000001',
            address: 'Samara, Lenina 1',
            hours: 'Mon-Sun 09:00-20:00',
            yearsActive: 1,
            staffCount: 1,
            isMultibrand: true,
            brandSpecializations: [],
            amenityIds: [],
        }
        expect(() => ownerAutoCareProviderSchema.parse({ ...provider, communicationMode: 'phone_only' })).toThrow()
        expect(ownerAutoCareProviderSchema.parse({ ...provider, chatEnabled: false, communicationMode: 'phone_only', responseWindowMinutes: null }).communicationMode).toBe('phone_only')
    })

    it('accepts opaque private document references and rejects public document URLs', () => {
        const provider = {
            ...base,
            name: 'Documented Garage',
            marketId: '00000000-0000-4000-8000-000000000001',
            address: 'Samara, Lenina 1',
            hours: 'Mon-Sun 09:00-20:00',
            yearsActive: 1,
            staffCount: 1,
            isMultibrand: true,
            brandSpecializations: [],
            amenityIds: [],
        }
        const parsed = ownerAutoCareProviderSchema.parse({
            ...provider,
            documents: [{ label: 'Лицензия', reference: 'private://providers/docs/license.pdf', expiresAt: '2026-12-01T00:00:00Z' }],
        })
        expect(parsed.documents).toHaveLength(1)
        expect(() => ownerAutoCareProviderSchema.parse({
            ...provider,
            documents: [{ label: 'Лицензия', reference: 'https://example.com/license.pdf' }],
        })).toThrow()
    })
})
