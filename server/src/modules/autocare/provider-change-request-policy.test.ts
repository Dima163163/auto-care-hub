import { describe, expect, it } from 'vitest'

import { AutomotiveProviderChangeRequestKind, AutomotiveProviderChangeRequestStatus } from '../../entities/automotive/provider-change-request.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { normalizeProviderChangeRequestDecision, normalizeProviderChangeRequestInput, normalizeProviderChangeRequestQuery, normalizeProviderChangeRequestUuid, normalizeProviderProfileChangePayload } from './provider-change-request-policy.js'

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

    it('normalizes admin queue filters and bounds enum values', () => {
        expect(normalizeProviderChangeRequestQuery('  PENDING ', ' PROFILE_UPDATE ')).toEqual({
            status: AutomotiveProviderChangeRequestStatus.Pending,
            kind: AutomotiveProviderChangeRequestKind.ProfileUpdate,
        })
        expect(normalizeProviderChangeRequestQuery(undefined, undefined)).toEqual({})
        expect(normalizeProviderChangeRequestQuery('unknown', undefined)).toBeNull()
        expect(normalizeProviderChangeRequestQuery(undefined, 'unknown')).toBeNull()
    })

    it('normalizes direct admin decisions and request identifiers', () => {
        expect(normalizeProviderChangeRequestDecision(' APPROVED ', '  Looks good.  ')).toEqual({ status: AutomotiveProviderChangeRequestStatus.Approved, reason: 'Looks good.' })
        expect(normalizeProviderChangeRequestDecision(AutomotiveProviderChangeRequestStatus.Rejected, null)).toEqual({ status: AutomotiveProviderChangeRequestStatus.Rejected, reason: null })
        expect(normalizeProviderChangeRequestDecision('pending', 'invalid')).toBeNull()
        expect(normalizeProviderChangeRequestDecision('rejected', 'x'.repeat(2_001))).toBeNull()
        expect(normalizeProviderChangeRequestDecision('approved', 42)).toBeNull()
        expect(normalizeProviderChangeRequestUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeProviderChangeRequestUuid('not-a-uuid')).toBeNull()
    })

    it('normalizes owner change request kind and profile payload at the service boundary', () => {
        expect(normalizeProviderChangeRequestInput({
            kind: ' PROFILE_UPDATE ',
            payload: { name: '  Garage  ', phones: [' +79990000000 ', '+79990000000'] },
        })).toEqual({
            kind: AutomotiveProviderChangeRequestKind.ProfileUpdate,
            payload: { name: 'Garage', phones: ['+79990000000'] },
        })
        expect(normalizeProviderChangeRequestInput({ kind: 'verification' })).toEqual({ kind: AutomotiveProviderChangeRequestKind.Verification, payload: {} })
    })

    it('rejects malformed owner change request envelopes', () => {
        expect(normalizeProviderChangeRequestInput({ kind: 'unknown', payload: {} })).toBeNull()
        expect(normalizeProviderChangeRequestInput({ kind: 'verification', payload: { name: 'not allowed' } })).toBeNull()
        expect(normalizeProviderChangeRequestInput({ kind: 'profile_update', payload: null })).toBeNull()
        expect(normalizeProviderChangeRequestInput({ kind: 'profile_update', payload: { unknown: true } })).toBeNull()
        expect(normalizeProviderChangeRequestInput({ kind: 'profile_update', payload: {}, extra: true })).toBeNull()
    })
})
