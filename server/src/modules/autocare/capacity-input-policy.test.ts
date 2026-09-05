import { describe, expect, it } from 'vitest'

import { AutoCareCapacityResourceType } from '../../entities/automotive/capacity-resource.entity.js'
import {
    normalizeAutoCareCapacityProviderUuid,
    normalizeAutoCareCapacityReservationQuery,
    normalizeAutoCareCapacityResourceInput,
    normalizeAutoCareCapacityResourcePatch,
} from './capacity-input-policy.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const locationId = '22222222-2222-4222-8222-222222222222'

describe('capacity input boundary policy', () => {
    it('normalizes resource creation input and applies safe defaults', () => {
        expect(normalizeAutoCareCapacityResourceInput({
            locationId: locationId.toUpperCase(),
            type: AutoCareCapacityResourceType.Bay,
            name: '  Bay 1 ',
            capacity: 2,
            metadata: {},
        })).toEqual({ locationId, type: AutoCareCapacityResourceType.Bay, name: 'Bay 1', capacity: 2, active: true, metadata: {} })
    })

    it('rejects malformed resource creation payloads', () => {
        expect(normalizeAutoCareCapacityResourceInput({ locationId, type: 'unknown', name: 'Bay', capacity: 1, active: true, metadata: {} })).toBeNull()
        expect(normalizeAutoCareCapacityResourceInput({ locationId, type: 'bay', name: '', capacity: 1, active: true, metadata: {} })).toBeNull()
        expect(normalizeAutoCareCapacityResourceInput({ locationId, type: 'bay', name: 'Bay', capacity: 101, active: true, metadata: {} })).toBeNull()
        expect(normalizeAutoCareCapacityResourceInput({ locationId, type: 'bay', name: 'Bay', capacity: 1, active: true, metadata: { extra: 'x' }, unknown: true })).toBeNull()
    })

    it('normalizes partial resource updates and bounds metadata', () => {
        expect(normalizeAutoCareCapacityResourcePatch({ name: '  Updated bay ', capacity: 3, active: false })).toEqual({ name: 'Updated bay', capacity: 3, active: false })
        expect(normalizeAutoCareCapacityResourcePatch({ metadata: Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`key-${index}`, true])) })).toBeNull()
        expect(normalizeAutoCareCapacityResourcePatch({ type: 'invalid' })).toBeNull()
    })

    it('normalizes reservation ranges and location scope', () => {
        expect(normalizeAutoCareCapacityReservationQuery({ locationId: ` ${locationId} `, from: ' 2026-08-31T09:00:00+04:00 ', to: '2026-08-31T10:00:00+04:00' })).toEqual({ locationId, from: '2026-08-31T09:00:00+04:00', to: '2026-08-31T10:00:00+04:00' })
        expect(normalizeAutoCareCapacityReservationQuery({ locationId: 'bad', from: undefined, to: undefined })).toBeNull()
        expect(normalizeAutoCareCapacityReservationQuery({ from: '2026-08-31', to: undefined })).toBeNull()
    })

    it('returns canonical provider IDs for branch permissions', () => {
        expect(normalizeAutoCareCapacityProviderUuid(providerId.toUpperCase())).toBe(providerId)
        expect(normalizeAutoCareCapacityProviderUuid('provider-1')).toBeNull()
    })
})
