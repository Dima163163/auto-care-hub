import { describe, expect, it } from 'vitest'

import { normalizeAutoCareRequestUuid, normalizeAutoCareServiceRequestInput } from './request-input-policy.js'

describe('AutoCare service request input policy', () => {
    it('canonicalizes service request UUIDs for transition boundaries', () => {
        expect(normalizeAutoCareRequestUuid('  11111111-1111-4111-8111-111111111111 ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAutoCareRequestUuid('request-1')).toBeNull()
    })

    it('canonicalizes identifiers, datetime and snapshots', () => {
        expect(normalizeAutoCareServiceRequestInput({
            providerId: '11111111-1111-4111-8111-111111111111'.toUpperCase(),
            locationId: '22222222-2222-4222-8222-222222222222',
            offeringId: '33333333-3333-4333-8333-333333333333',
            preferredAt: '  2026-09-04T10:30:00.000+03:00  ',
            vehicleSnapshot: { make: ' BMW ', model: ' X5 ', year: 2021, vin: ' wba1234567890abcd ' },
            contactSnapshot: { name: '  Alex Client  ', email: ' Alex@Example.com ', phone: ' +79990000000 ' },
            note: '  Нужна диагностика  ',
            idempotencyKey: '  request-1234  ',
        })).toEqual({
            providerId: '11111111-1111-4111-8111-111111111111',
            locationId: '22222222-2222-4222-8222-222222222222',
            offeringId: '33333333-3333-4333-8333-333333333333',
            preferredAt: '2026-09-04T07:30:00.000Z',
            vehicleId: null,
            vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, vin: 'WBA1234567890ABCD' },
            contactSnapshot: { name: 'Alex Client', email: 'alex@example.com', phone: '+79990000000' },
            note: 'Нужна диагностика',
            idempotencyKey: 'request-1234',
        })
    })

    it('keeps partial contact snapshots for internal fixtures while validating present fields', () => {
        expect(normalizeAutoCareServiceRequestInput({ providerId: '11111111-1111-4111-8111-111111111111', locationId: '22222222-2222-4222-8222-222222222222', offeringId: '33333333-3333-4333-8333-333333333333', preferredAt: '2026-09-04T10:30:00.000Z', contactSnapshot: { name: 'Client', phone: '+10000000000' } })?.contactSnapshot).toEqual({ name: 'Client', phone: '+10000000000' })
    })

    it('rejects malformed identifiers, dates and contact values', () => {
        const base = { providerId: '11111111-1111-4111-8111-111111111111', locationId: '22222222-2222-4222-8222-222222222222', offeringId: '33333333-3333-4333-8333-333333333333', preferredAt: '2026-09-04T10:30:00.000Z', contactSnapshot: { name: 'Client', phone: '+10000000000' } }
        expect(normalizeAutoCareServiceRequestInput({ ...base, providerId: 'not-a-uuid' })).toBeNull()
        expect(normalizeAutoCareServiceRequestInput({ ...base, preferredAt: 'tomorrow' })).toBeNull()
        expect(normalizeAutoCareServiceRequestInput({ ...base, contactSnapshot: { email: 'not-an-email' } })).toBeNull()
        expect(normalizeAutoCareServiceRequestInput({ ...base, note: 'x'.repeat(4_001) })).toBeNull()
    })

    it('rejects unsafe vehicle snapshots before JSONB persistence', () => {
        const base = { providerId: '11111111-1111-4111-8111-111111111111', locationId: '22222222-2222-4222-8222-222222222222', offeringId: '33333333-3333-4333-8333-333333333333', preferredAt: '2026-09-04T10:30:00.000Z', contactSnapshot: { name: 'Client', phone: '+10000000000' } }
        expect(normalizeAutoCareServiceRequestInput({ ...base, vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, unknown: 'value' } })).toBeNull()
        expect(normalizeAutoCareServiceRequestInput({ ...base, vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, mileage: -1 } })).toBeNull()
        expect(normalizeAutoCareServiceRequestInput({ ...base, vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, vin: 42 } })).toBeNull()
    })
})
