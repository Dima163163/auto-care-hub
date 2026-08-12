import { describe, expect, it } from 'vitest'

import {
    googleProfileResponseSchema,
    googleTokenResponseSchema,
    yandexProfileResponseSchema,
    yandexTokenResponseSchema,
} from './oauth-response-schemas.js'

describe('OAuth provider response schemas', () => {
    it('accepts bounded Google token and profile payloads', () => {
        expect(googleTokenResponseSchema.parse({
            access_token: 'access-token',
            expires_in: 3600,
            scope: 'openid email profile',
            token_type: 'Bearer',
            id_token: 'id-token',
        }).access_token).toBe('access-token')

        expect(googleProfileResponseSchema.parse({
            sub: 'google-user',
            name: 'User',
            email: 'user@example.com',
            email_verified: true,
        }).email).toBe('user@example.com')
    })

    it('accepts bounded Yandex token and profile payloads', () => {
        expect(yandexTokenResponseSchema.parse({
            access_token: 'access-token',
            expires_in: 3600,
            token_type: 'OAuth',
        }).token_type).toBe('OAuth')

        expect(yandexProfileResponseSchema.parse({
            id: 'yandex-user',
            display_name: 'User',
            default_email: 'user@example.com',
            emails: ['user@example.com'],
        }).id).toBe('yandex-user')
    })

    it('rejects missing credentials and malformed provider identities', () => {
        expect(() => googleTokenResponseSchema.parse({ expires_in: 3600 })).toThrow()
        expect(() => googleProfileResponseSchema.parse({
            sub: 'google-user',
            name: 'User',
            email: 'not-an-email',
            email_verified: true,
        })).toThrow()
        expect(() => yandexProfileResponseSchema.parse({
            id: 'yandex-user',
            display_name: 'User',
            default_email: 'user@example.com',
            emails: ['not-an-email'],
        })).toThrow()
    })
})
