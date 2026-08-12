import { describe, expect, it } from 'vitest'

import {
    normalizeCreateAdminResponse,
    normalizeAdminUserListResponse,
    normalizeOwnerClientListResponse,
    normalizeUserPageResponse,
} from './user-response-schema'

const user = {
    id: 'user-1',
    name: 'Alex',
    email: 'alex@example.com',
    phone: null,
    role: 'client' as const,
    status: 'active' as const,
    avatarUrl: null,
    provider: 'email' as const,
    locale: null,
    emailVerifiedAt: null,
    emailNotifications: true,
    bookingEmailNotifications: true,
    preferredCity: null,
    preferredCategories: [],
    createdAt: '2026-08-01T00:00:00.000Z',
}

describe('user response schemas', () => {
    it('normalizes list and cursor page responses', () => {
        expect(normalizeUserPageResponse([user])).toEqual({ items: [user], nextCursor: null })
        expect(normalizeUserPageResponse({ items: [user], nextCursor: 'next' }).nextCursor).toBe('next')
    })

    it('fills defaults for the reduced admin user payload', () => {
        expect(normalizeAdminUserListResponse([{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            avatarUrl: user.avatarUrl,
            provider: user.provider,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
        }])).toEqual([user])
    })

    it('validates owner clients and admin setup responses', () => {
        expect(normalizeOwnerClientListResponse([{
            id: 'client-1',
            name: 'Client',
            email: 'client@example.com',
            phone: null,
        }])).toHaveLength(1)
        expect(normalizeCreateAdminResponse({
            user,
            passwordSetupToken: 'setup-token',
            passwordSetupExpiresAt: '2026-08-01T01:00:00.000Z',
        }).user.id).toBe('user-1')
        expect(() => normalizeCreateAdminResponse({ user, passwordSetupToken: '' })).toThrow()
    })

    it('accepts a persisted locale while retaining the nullable legacy default', () => {
        expect(normalizeUserPageResponse([{ ...user, locale: 'de' }]).items[0]?.locale).toBe('de')
        expect(normalizeAdminUserListResponse([{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            avatarUrl: user.avatarUrl,
            provider: user.provider,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
        }])[0]?.locale).toBeNull()
    })
})
