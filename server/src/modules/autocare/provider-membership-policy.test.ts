import { describe, expect, it } from 'vitest'

import { AutomotiveProviderInvitationRole } from '../../entities/automotive/provider-invitation.entity.js'
import {
    normalizeProviderInvitationInput,
    normalizeProviderInvitationToken,
    normalizeProviderMembershipUuid,
} from './provider-membership-policy.js'

describe('provider membership boundary policy', () => {
    it('normalizes invitation email, role and optional location scope', () => {
        expect(normalizeProviderInvitationInput({
            email: '  OWNER@EXAMPLE.COM ',
            role: ' MANAGER ',
            locationId: ' 11111111-1111-4111-8111-111111111111 ',
        })).toEqual({
            email: 'owner@example.com',
            role: AutomotiveProviderInvitationRole.Manager,
            locationId: '11111111-1111-4111-8111-111111111111',
        })
        expect(normalizeProviderInvitationInput({ email: 'staff@example.com', role: 'staff' })).toEqual({
            email: 'staff@example.com',
            role: AutomotiveProviderInvitationRole.Staff,
            locationId: null,
        })
    })

    it('fails closed for unsupported invitation fields and malformed scopes', () => {
        expect(normalizeProviderInvitationInput({ email: 'staff@example.com', role: 'staff', unexpected: true })).toBeNull()
        expect(normalizeProviderInvitationInput({ email: 'not-an-email', role: 'staff' })).toBeNull()
        expect(normalizeProviderInvitationInput({ email: 'staff@example.com', role: 'owner' })).toBeNull()
        expect(normalizeProviderInvitationInput({ email: 'staff@example.com', role: 'staff', locationId: 'not-a-uuid' })).toBeNull()
        expect(normalizeProviderInvitationInput(null)).toBeNull()
    })

    it('canonicalizes UUIDs and rejects invalid identifiers', () => {
        expect(normalizeProviderMembershipUuid(' 11111111-1111-4111-8111-111111111111 ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeProviderMembershipUuid('not-a-uuid')).toBeNull()
        expect(normalizeProviderMembershipUuid(null)).toBeNull()
        expect(normalizeProviderMembershipUuid('11111111-1111-0111-8111-111111111111')).toBeNull()
    })

    it('trims valid invitation tokens and rejects malformed values', () => {
        const token = 'a'.repeat(32)
        expect(normalizeProviderInvitationToken(`  ${token}  `)).toBe(token)
        expect(normalizeProviderInvitationToken(null)).toBeNull()
        expect(normalizeProviderInvitationToken('short')).toBeNull()
        expect(normalizeProviderInvitationToken(`${token}!`)).toBeNull()
    })
})
