import { describe, expect, it } from 'vitest'

import {
    normalizeAutoCareBonusProviderUuid,
    normalizeGrantAutoCareBonusInput,
    normalizeOwnerAutoCareBonusProgramInput,
    normalizeRedeemAutoCareBonusInput,
} from './bonus-input-policy.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const requestId = '22222222-2222-4222-8222-222222222222'
const clientId = '33333333-3333-4333-8333-333333333333'

describe('bonus input boundary policy', () => {
    it('normalizes a bonus programme without changing its numeric policy', () => {
        expect(normalizeOwnerAutoCareBonusProgramInput({
            name: '  Service bonus  ',
            earnPercent: 5,
            maxEarnPointsPerVisit: 250,
            expiresAfterDays: 365,
            active: false,
        })).toEqual({
            name: 'Service bonus',
            earnPercent: 5,
            maxEarnPointsPerVisit: 250,
            expiresAfterDays: 365,
            active: false,
        })
        expect(normalizeOwnerAutoCareBonusProgramInput({ name: 'Bonus', earnPercent: 0 })).toEqual({
            name: 'Bonus',
            earnPercent: 0,
            maxEarnPointsPerVisit: null,
            expiresAfterDays: null,
            active: true,
        })
    })

    it('rejects unknown or malformed bonus programme fields', () => {
        expect(normalizeOwnerAutoCareBonusProgramInput({ name: 'Bonus', earnPercent: 5, unexpected: true })).toBeNull()
        expect(normalizeOwnerAutoCareBonusProgramInput({ name: 'x', earnPercent: 5 })).toBeNull()
        expect(normalizeOwnerAutoCareBonusProgramInput({ name: 'Bonus', earnPercent: 101 })).toBeNull()
        expect(normalizeOwnerAutoCareBonusProgramInput({ name: 'Bonus', earnPercent: 5, maxEarnPointsPerVisit: 1.5 })).toBeNull()
        expect(normalizeOwnerAutoCareBonusProgramInput({ name: 'Bonus', earnPercent: 5, active: null })).toBeNull()
    })

    it('canonicalizes redemption identifiers and bounds points', () => {
        expect(normalizeRedeemAutoCareBonusInput({ providerId: providerId.toUpperCase(), requestId, points: 50 })).toEqual({ providerId, requestId, points: 50 })
        expect(normalizeRedeemAutoCareBonusInput({ providerId: 'not-a-uuid', requestId, points: 50 })).toBeNull()
        expect(normalizeRedeemAutoCareBonusInput({ providerId, requestId, points: 0 })).toBeNull()
        expect(normalizeRedeemAutoCareBonusInput({ providerId, requestId, points: 1.5 })).toBeNull()
        expect(normalizeRedeemAutoCareBonusInput({ providerId, requestId, points: 10, extra: true })).toBeNull()
    })

    it('canonicalizes manual grant payloads and rejects unsafe values', () => {
        expect(normalizeGrantAutoCareBonusInput({ providerId, clientId: clientId.toUpperCase(), points: 25, reason: '  Customer recovery  ' })).toEqual({ providerId, clientId, points: 25, reason: 'Customer recovery' })
        expect(normalizeGrantAutoCareBonusInput({ providerId, clientId, points: 25, reason: 'too short' })).toBeNull()
        expect(normalizeGrantAutoCareBonusInput({ providerId, clientId: 10, points: 25, reason: 'Valid reason text' })).toBeNull()
        expect(normalizeGrantAutoCareBonusInput({ providerId, clientId, points: 100001, reason: 'Valid reason text' })).toBeNull()
    })

    it('returns only canonical UUIDs for provider-scoped lookups', () => {
        expect(normalizeAutoCareBonusProviderUuid(` ${providerId.toUpperCase()} `)).toBe(providerId)
        expect(normalizeAutoCareBonusProviderUuid('not-a-uuid')).toBeNull()
    })
})
