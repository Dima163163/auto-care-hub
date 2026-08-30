import { describe, expect, it } from 'vitest'

import { parseOwnerProviderProfileDraft } from './owner-provider-profile-draft'

describe('owner provider profile draft parser', () => {
    it('restores non-sensitive profile fields', () => {
        expect(parseOwnerProviderProfileDraft({
            text: {
                name: 'ProService',
                description: 'Ремонт и диагностика',
                websiteUrl: 'https://service.example',
                metroStation: 'Парк культуры',
                warrantyText: '12 месяцев',
                yearsActive: '8',
                staffCount: '2',
                workstationCount: '4',
                brandSpecializations: 'BMW, Toyota',
            },
            isMultibrand: false,
        })).toEqual({
            text: {
                name: 'ProService',
                description: 'Ремонт и диагностика',
                websiteUrl: 'https://service.example',
                metroStation: 'Парк культуры',
                warrantyText: '12 месяцев',
                yearsActive: '8',
                staffCount: '2',
                workstationCount: '4',
                brandSpecializations: 'BMW, Toyota',
            },
            isMultibrand: false,
        })
    })

    it('drops malformed and sensitive values', () => {
        const parsed = parseOwnerProviderProfileDraft({
            text: {
                name: 'x'.repeat(2_001),
                description: 'ok',
                email: 'owner@example.com',
                phones: '+79990000000',
                documentReference: 'private://documents/1',
            },
            isMultibrand: 'yes',
            vin: 'WBAXXXXXXXX123456',
        })

        expect(parsed).toEqual({
            text: {
                name: '',
                description: 'ok',
                websiteUrl: '',
                metroStation: '',
                warrantyText: '',
                yearsActive: '',
                staffCount: '',
                workstationCount: '',
                brandSpecializations: '',
            },
            isMultibrand: true,
        })
        expect(parsed?.text).not.toHaveProperty('email')
        expect(parsed?.text).not.toHaveProperty('phones')
        expect(parsed).not.toHaveProperty('vin')
    })
})
