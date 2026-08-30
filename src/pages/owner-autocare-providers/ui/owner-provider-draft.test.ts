import { describe, expect, it } from 'vitest'

import { parseOwnerProviderDraft } from './owner-provider-draft'

describe('owner provider draft parser', () => {
    it('restores bounded text and communication settings', () => {
        expect(parseOwnerProviderDraft({
            text: {
                name: 'ProService',
                description: 'Диагностика и ремонт',
                address: 'ул. Льва Толстого, 18',
                hours: 'Пн–Вс: 08:00–21:00',
                yearsActive: '8',
                staffCount: '2',
                workstationCount: '4',
                websiteUrl: 'https://service.example',
                metroStation: 'Парк культуры',
                warrantyText: '12 месяцев',
                bonusSummary: '5% бонусами',
            },
            isMultibrand: false,
            chatEnabled: true,
            communicationMode: 'online',
            selectedBrands: ['bmw', 'toyota'],
            selectedAmenities: ['waiting-room'],
        })).toMatchObject({
            text: expect.objectContaining({ name: 'ProService', staffCount: '2' }),
            isMultibrand: false,
            chatEnabled: true,
            communicationMode: 'online',
            selectedBrands: ['bmw', 'toyota'],
            selectedAmenities: ['waiting-room'],
        })
    })

    it('rejects malformed roots and strips sensitive or unbounded values', () => {
        expect(parseOwnerProviderDraft(null)).toBeNull()
        expect(parseOwnerProviderDraft({ text: [] })).toBeNull()

        const parsed = parseOwnerProviderDraft({
            text: {
                name: 'x'.repeat(2_001),
                description: 'ok',
                phone: '+79990000000',
                email: 'owner@example.com',
            },
            communicationMode: 'invalid',
            selectedBrands: ['bmw', 'x'.repeat(121)],
            selectedAmenities: 'waiting-room',
            vin: 'WBAXXXXXXXX123456',
        })

        expect(parsed).toMatchObject({
            text: expect.objectContaining({ name: '', description: 'ok' }),
            communicationMode: 'request_then_confirm',
            selectedBrands: ['bmw'],
            selectedAmenities: [],
        })
        expect(parsed?.text).not.toHaveProperty('phone')
        expect(parsed?.text).not.toHaveProperty('email')
        expect(parsed).not.toHaveProperty('vin')
    })
})
