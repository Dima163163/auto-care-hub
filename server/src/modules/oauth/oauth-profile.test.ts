import { describe, expect, it } from 'vitest'

import { normalizeOAuthProfile } from './oauth-profile.js'

const validProfile = {
    providerId: 'google-subject',
    email: ' User@Example.com ',
    name: ' User Name ',
    avatarUrl: 'https://images.example/avatar.png',
    isEmailVerified: true,
}

describe('OAuth profile bounds', () => {
    it('normalizes provider profile values', () => {
        expect(normalizeOAuthProfile(validProfile)).toEqual({
            providerId: 'google-subject',
            email: 'user@example.com',
            name: 'User Name',
            avatarUrl: 'https://images.example/avatar.png',
            isEmailVerified: true,
        })
    })

    it('rejects oversized identity fields and non-HTTPS avatars', () => {
        expect(() => normalizeOAuthProfile({
            ...validProfile,
            providerId: 'x'.repeat(257),
        })).toThrow(/accepted bounds/)
        expect(() => normalizeOAuthProfile({
            ...validProfile,
            avatarUrl: 'http://images.example/avatar.png',
        })).toThrow(/avatar URL/)
    })

    it('removes control characters from profile text', () => {
        expect(normalizeOAuthProfile({
            ...validProfile,
            name: ' OAuth\n User ',
        }).name).toBe('OAuth User')
    })
})
