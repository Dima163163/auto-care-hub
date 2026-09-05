import { describe, expect, it } from 'vitest'
import { normalizeAutoCareCommunicationProviderUuid, normalizeAutoCareCommunicationSettingsInput } from './communication-input-policy.js'

const base = {
    teamSize: 'small_team',
    businessType: 'company',
    chatEnabled: true,
    communicationMode: 'online',
    responseWindowMinutes: 240,
    responseHours: 'working_hours',
    phoneBookingEnabled: true,
    callbackEnabled: true,
    requestPhotosEnabled: true,
    publicContactNote: '  Отвечаем в рабочее время.  ',
}

describe('auto care communication input policy', () => {
    it('canonicalizes provider UUIDs before owner lookup', () => {
        expect(normalizeAutoCareCommunicationProviderUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAutoCareCommunicationProviderUuid('provider-1')).toBeNull()
    })

    it('normalizes a complete settings payload and keeps only communication fields', () => {
        expect(normalizeAutoCareCommunicationSettingsInput(base)).toEqual({
            ...base,
            publicContactNote: 'Отвечаем в рабочее время.',
        })
    })

    it('normalizes enum whitespace and case without widening the accepted values', () => {
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, teamSize: ' TEAM ', communicationMode: ' REQUEST_THEN_CONFIRM ', responseHours: ' ALWAYS_ON ' })).toMatchObject({
            teamSize: 'team',
            communicationMode: 'request_then_confirm',
            responseHours: 'always_on',
        })
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, communicationMode: 'unknown' })).toBeNull()
    })

    it('rejects provider-owned fields, partial payloads and malformed primitive values', () => {
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, ownerId: 'attacker' })).toBeNull()
        const { publicContactNote: _note, ...partial } = base
        expect(normalizeAutoCareCommunicationSettingsInput(partial)).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, chatEnabled: 'true' })).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, responseWindowMinutes: 14 })).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, responseWindowMinutes: 10_081 })).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, publicContactNote: 'x'.repeat(241) })).toBeNull()
    })

    it('enforces the same cross-field communication rules as the schema', () => {
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, communicationMode: 'phone_only', chatEnabled: true })).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, communicationMode: 'phone_only', chatEnabled: false, phoneBookingEnabled: false })).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, chatEnabled: true, responseWindowMinutes: null })).toBeNull()
        expect(normalizeAutoCareCommunicationSettingsInput({ ...base, communicationMode: 'phone_only', chatEnabled: false, responseWindowMinutes: null })).toMatchObject({ communicationMode: 'phone_only', responseWindowMinutes: null })
    })
})
