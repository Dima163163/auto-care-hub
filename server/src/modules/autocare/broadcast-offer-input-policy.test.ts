import { describe, expect, it } from 'vitest'

import { normalizeAutoCareBroadcastOfferInput } from './broadcast-offer-input-policy.js'

const base = {
    locationId: ' 11111111-1111-4111-8111-111111111111 ',
    amountMinor: 12_500,
    currencyCode: ' rub ',
    note: '  Готовы принять автомобиль сегодня.  ',
    durationMinutes: 90,
    validUntil: ' 2026-09-05T12:00:00.000+03:00 ',
}

describe('AutoCare broadcast offer input policy', () => {
    it('canonicalizes the persisted offer snapshot fields', () => {
        expect(normalizeAutoCareBroadcastOfferInput(base)).toEqual({
            locationId: '11111111-1111-4111-8111-111111111111',
            amountMinor: 12_500,
            currencyCode: 'RUB',
            note: 'Готовы принять автомобиль сегодня.',
            durationMinutes: 90,
            validUntil: '2026-09-05T12:00:00.000+03:00',
        })
    })

    it('applies nullable defaults for optional fields', () => {
        expect(normalizeAutoCareBroadcastOfferInput({
            locationId: base.locationId,
            amountMinor: base.amountMinor,
            currencyCode: base.currencyCode,
        })).toEqual({
            locationId: '11111111-1111-4111-8111-111111111111',
            amountMinor: 12_500,
            currencyCode: 'RUB',
            note: null,
            durationMinutes: undefined,
            validUntil: null,
        })
    })

    it('rejects malformed values and unknown fields before persistence', () => {
        expect(normalizeAutoCareBroadcastOfferInput({ ...base, unknown: true })).toBeNull()
        expect(normalizeAutoCareBroadcastOfferInput({ ...base, amountMinor: Number.NaN })).toBeNull()
        expect(normalizeAutoCareBroadcastOfferInput({ ...base, durationMinutes: 2_881 })).toBeNull()
        expect(normalizeAutoCareBroadcastOfferInput({ ...base, validUntil: 'tomorrow' })).toBeNull()
        expect(normalizeAutoCareBroadcastOfferInput({ ...base, locationId: 'location-1' })).toBeNull()
    })
})
