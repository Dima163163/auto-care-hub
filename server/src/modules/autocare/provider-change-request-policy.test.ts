import { describe, expect, it } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'
import { normalizeProviderProfileChangePayload } from './provider-change-request-policy.js'

describe('provider change request payload policy', () => {
    it('trims and deduplicates bounded profile collections', () => {
        expect(normalizeProviderProfileChangePayload({
            name: '  Garage  ',
            phones: [' +79990000000 ', '+79990000000'],
            amenityIds: [' wifi ', 'wifi'],
            brandSpecializations: [' bmw ', 'bmw'],
            documents: [{
                label: ' Лицензия ',
                reference: ' private://providers/docs/license.pdf ',
                expiresAt: '2026-12-01T00:00:00Z',
            }],
        })).toEqual({
            name: 'Garage',
            phones: ['+79990000000'],
            amenityIds: ['wifi'],
            brandSpecializations: ['bmw'],
            documents: [{
                label: 'Лицензия',
                reference: 'private://providers/docs/license.pdf',
                expiresAt: '2026-12-01T00:00:00Z',
            }],
        })
    })

    it.each([
        { phones: ['+79990000000', '+79990000001', '+79990000002', '+79990000003', '+79990000004', '+79990000005'] },
        { brandSpecializations: Array.from({ length: 31 }, (_, index) => `brand-${index}`) },
        { documents: Array.from({ length: 21 }, (_, index) => ({ label: `Doc ${index}`, reference: `private://providers/docs/${index}.pdf` })) },
        { phones: ['x'.repeat(33)] },
        { email: 'not-an-email' },
        { websiteUrl: 'not-a-url' },
        { documents: [{ label: 'License', reference: 'https://example.com/license.pdf' }] },
    ])('rejects payload outside the owner profile bounds', (payload) => {
        expect(() => normalizeProviderProfileChangePayload(payload)).toThrow(AppError)
    })

    it('rejects unsupported fields before persisting a change request', () => {
        expect(() => normalizeProviderProfileChangePayload({ publicContactNote: 'unexpected' })).toThrow(/Unsupported provider profile fields/)
    })
})
