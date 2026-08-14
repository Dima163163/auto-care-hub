import { beforeEach, describe, expect, it } from 'vitest'

import { getAccessToken, clearAccessToken } from '@/shared/lib/auth-token'
import {
    normalizeAuthResponse,
    normalizeDeploymentCapabilitiesResponse,
    normalizeMeResponse,
    normalizeOAuthIdentitiesResponse,
    normalizeOAuthUrlResponse,
    normalizeUserSessionsResponse,
} from './auth-response-schema'

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
    createdAt: '2026-01-01T00:00:00.000Z',
}

describe('auth response schemas', () => {
    beforeEach(() => clearAccessToken())

    it('normalizes direct and wrapped user responses', () => {
        expect(normalizeMeResponse(user)).toEqual(user)
        expect(normalizeMeResponse({ user })).toEqual(user)
    })

    it('stores an access token only after validating the wrapped user', () => {
        expect(normalizeAuthResponse({ user, accessToken: 'token-1' })).toEqual(user)
        expect(getAccessToken()).toBe('token-1')
    })

    it('rejects malformed user payloads', () => {
        expect(() => normalizeMeResponse({ user: { id: 'missing-fields' } })).toThrow()
        expect(() => normalizeAuthResponse({ user: { id: 'missing-fields' }, accessToken: 42 })).toThrow()
        expect(getAccessToken()).toBeNull()
    })

    it('does not retain an access token when user validation fails', () => {
        expect(() => normalizeAuthResponse({
            user: { id: 'missing-fields' },
            accessToken: 'token-should-not-be-stored',
        })).toThrow()
        expect(getAccessToken()).toBeNull()
    })

    it('validates OAuth and session response boundaries', () => {
        expect(normalizeDeploymentCapabilitiesResponse({
            deploymentMarket: 'ru',
            auth: { oauthProviders: ['yandex'] },
        }).auth.oauthProviders).toEqual(['yandex'])
        expect(normalizeOAuthUrlResponse({
            provider: 'google',
            authUrl: 'https://accounts.google.com/o/oauth2/auth?state=test',
        }).provider).toBe('google')
        expect(normalizeOAuthUrlResponse({
            provider: 'google',
            authUrl: '/profile?tab=security',
        }).authUrl).toBe('/profile?tab=security')
        expect(normalizeOAuthIdentitiesResponse([{
            provider: 'google',
            isLinked: false,
            identityCount: 0,
            createdAt: null,
            canUnlink: false,
        }])).toHaveLength(1)
        expect(normalizeUserSessionsResponse([{
            id: 'session-1',
            userAgent: null,
            ipAddress: null,
            lastActiveAt: '2026-08-01T00:00:00.000Z',
            isCurrent: true,
        }])).toHaveLength(1)
        expect(() => normalizeOAuthUrlResponse({ provider: 'google', authUrl: 'javascript:alert(1)' })).toThrow()
        expect(() => normalizeOAuthUrlResponse({ provider: 'google', authUrl: '//evil.example.com/oauth' })).toThrow()
        expect(() => normalizeUserSessionsResponse([{ id: 'session-1' }])).toThrow()
    })
})
