import { describe, expect, it } from 'vitest'

import {
    UserProvider,
    UserRole,
    UserStatus,
    type UserEntity,
} from '../../entities/user/user.entity'
import { toPublicUser } from './public-user'

function createUser(emailVerifiedAt: Date | null): UserEntity {
    return {
        id: 'user-id',
        name: 'Test User',
        email: 'user@example.com',
        passwordHash: 'password-hash',
        phone: null,
        role: UserRole.Client,
        status: UserStatus.Active,
        avatarUrl: null,
        locale: 'de',
        provider: UserProvider.Email,
        tokenVersion: 1,
        emailVerifiedAt,
        emailNotifications: true,
        bookingEmailNotifications: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
}

describe('public user mapping', () => {
    it('exposes the email verification timestamp', () => {
        const emailVerifiedAt = new Date('2026-01-02T00:00:00.000Z')

        expect(toPublicUser(createUser(emailVerifiedAt))).toMatchObject({
            emailVerifiedAt,
        })
    })

    it('exposes null for an unverified email', () => {
        expect(toPublicUser(createUser(null))).toMatchObject({
            emailVerifiedAt: null,
        })
    })

    it('exposes the stored account locale', () => {
        expect(toPublicUser(createUser(null)).locale).toBe('de')
    })
})
