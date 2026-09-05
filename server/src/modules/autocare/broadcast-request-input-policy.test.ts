import { describe, expect, it } from 'vitest'

import { normalizeAutoCareBroadcastRequestInput } from './broadcast-request-input-policy.js'

const base = {
    serviceDefinitionId: '  brake-pads  ',
    marketId: '  moscow  ',
    issueDescription: '  Скрипят тормоза при остановке  ',
    vehicleSnapshot: { make: ' BMW ', model: ' X5 ', year: 2021, vin: ' wba1234567890abcd ' },
    photoUrls: [' private://autocare/requests/request-1/photo-1 '],
    preferredAt: '  2026-09-04T10:30:00.000+03:00  ',
    maxProviders: 3,
}

describe('AutoCare broadcast request input policy', () => {
    it('canonicalizes identifiers, description, snapshot, media and date', () => {
        expect(normalizeAutoCareBroadcastRequestInput(base)).toEqual({
            serviceDefinitionId: 'brake-pads',
            marketId: 'moscow',
            issueDescription: 'Скрипят тормоза при остановке',
            vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, vin: 'WBA1234567890ABCD' },
            photoUrls: ['private://autocare/requests/request-1/photo-1'],
            preferredAt: '2026-09-04T07:30:00.000Z',
            maxProviders: 3,
        })
    })

    it('applies stable defaults for optional fields', () => {
        expect(normalizeAutoCareBroadcastRequestInput({ serviceDefinitionId: 'brake-pads', issueDescription: 'Нужно проверить тормозную систему' })).toEqual({
            serviceDefinitionId: 'brake-pads',
            marketId: null,
            issueDescription: 'Нужно проверить тормозную систему',
            vehicleSnapshot: null,
            photoUrls: [],
            preferredAt: null,
            maxProviders: 5,
        })
    })

    it('rejects malformed descriptions, references, snapshots and dates', () => {
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, issueDescription: 'short' })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, photoUrls: ['https://evil.example/photo.webp'] })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, extra: true } })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, preferredAt: 'tomorrow' })).toBeNull()
    })

    it('bounds provider count and service/market references', () => {
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, maxProviders: 0 })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, maxProviders: 11 })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, maxProviders: '3' })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, serviceDefinitionId: 'x'.repeat(121) })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, marketId: 42 })).toBeNull()
    })

    it('rejects unknown fields and non-object payloads', () => {
        expect(normalizeAutoCareBroadcastRequestInput({ ...base, unknown: true })).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput(null)).toBeNull()
        expect(normalizeAutoCareBroadcastRequestInput([])).toBeNull()
    })
})
