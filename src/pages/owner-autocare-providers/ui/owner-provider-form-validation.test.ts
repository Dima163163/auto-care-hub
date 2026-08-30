import { describe, expect, it } from 'vitest'

import { validateOwnerProviderForm, type OwnerProviderFormDraft } from './owner-provider-form-validation'

const validDraft: OwnerProviderFormDraft = {
    marketId: 'market-samara',
    name: ' ProService ',
    description: '  Service for city cars  ',
    address: ' Lenina 1 ',
    hours: ' Mon–Sun: 09:00–21:00 ',
    yearsActive: '8',
    staffCount: '4',
    workstationCount: '2',
    phones: [' +7 900 000 00 00 ', '+7 900 000 00 00'],
    email: ' hello@example.com ',
    websiteUrl: 'https://example.com',
    metroStation: 'Central',
    warrantyText: '12 months',
    bonusSummary: '5% back',
    documents: [{ label: 'Certificate', reference: 'private://documents/certificate.pdf', expiresAt: '2030-05-20' }],
    isMultibrand: true,
    brandSpecializations: [],
}

describe('validateOwnerProviderForm', () => {
    it('normalizes scalar fields, deduplicates phones and converts document dates', () => {
        const result = validateOwnerProviderForm(validDraft)

        expect(result).toEqual(expect.objectContaining({
            valid: true,
            name: 'ProService',
            description: 'Service for city cars',
            yearsActive: 8,
            phones: ['+7 900 000 00 00'],
            documents: [{ label: 'Certificate', reference: 'private://documents/certificate.pdf', expiresAt: '2030-05-20T00:00:00.000Z' }],
        }))
    })

    it('rejects whitespace-only required fields and invalid integer ranges', () => {
        expect(validateOwnerProviderForm({ ...validDraft, name: ' ' })).toEqual({ valid: false, reason: 'name' })
        expect(validateOwnerProviderForm({ ...validDraft, yearsActive: '1.5' })).toEqual({ valid: false, reason: 'yearsActive' })
        expect(validateOwnerProviderForm({ ...validDraft, staffCount: '10001' })).toEqual({ valid: false, reason: 'staffCount' })
    })

    it('rejects invalid optional contacts, incomplete evidence and impossible dates', () => {
        expect(validateOwnerProviderForm({ ...validDraft, email: 'not-an-email' })).toEqual({ valid: false, reason: 'email' })
        expect(validateOwnerProviderForm({ ...validDraft, websiteUrl: 'not-a-url' })).toEqual({ valid: false, reason: 'websiteUrl' })
        expect(validateOwnerProviderForm({ ...validDraft, documents: [{ label: 'Certificate', reference: 'https://public.example', expiresAt: '' }] })).toEqual({ valid: false, reason: 'document' })
        expect(validateOwnerProviderForm({ ...validDraft, documents: [{ label: 'Certificate', reference: 'private://documents/certificate.pdf', expiresAt: '2030-02-30' }] })).toEqual({ valid: false, reason: 'document' })
    })
})
