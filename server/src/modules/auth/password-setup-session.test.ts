import { beforeEach, describe, expect, it, vi } from 'vitest'

const passwordSetupMocks = vi.hoisted(() => ({
    consumeUsableSecurityToken: vi.fn(),
}))

vi.mock('./security-token.service.js', () => ({
    createSecurityToken: vi.fn(),
    consumeUsableSecurityToken: passwordSetupMocks.consumeUsableSecurityToken,
    findUsableSecurityToken: vi.fn(),
    EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: 1440,
    SecurityTokenPurpose: {
        PasswordSetup: 'password_setup',
        PasswordReset: 'password_reset',
        EmailVerification: 'email_verification',
    },
}))

vi.mock('./session.service.js', () => ({
    createUserSession: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    rotateUserSession: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('hashed-password'),
}))

vi.mock('./password-policy.js', () => ({
    assertPasswordSecurityPolicy: vi.fn(async (password: string) => password),
    assertPasswordVerificationInput: vi.fn(),
}))

import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { verifyAccessToken, verifyRefreshToken } from './auth-token.js'
import { completePasswordSetup } from './auth.service.js'

function setupConsumption(
    tokenRelationUser: Record<string, unknown>,
    lockedUser = tokenRelationUser,
) {
    const save = vi.fn(async (savedUser: Record<string, unknown>) => savedUser)
    const userQueryBuilder = {
        where: vi.fn(),
        setLock: vi.fn(),
        getOne: vi.fn().mockResolvedValue(lockedUser),
    }
    userQueryBuilder.where.mockReturnValue(userQueryBuilder)
    userQueryBuilder.setLock.mockReturnValue(userQueryBuilder)
    const userRepository = {
        createQueryBuilder: vi.fn(() => userQueryBuilder),
        save,
    }
    const sessionRepository = {
        create: vi.fn((session: Record<string, unknown>) => session),
        save: vi.fn(async (session: Record<string, unknown>) => ({
            ...session,
            id: '00000000-0000-4000-8000-000000000002',
        })),
    }
    const manager = {
        getRepository: vi.fn((entity) => entity === UserEntity ? userRepository : sessionRepository),
    }
    const securityToken = { user: tokenRelationUser, userId: tokenRelationUser.id }

    passwordSetupMocks.consumeUsableSecurityToken.mockImplementation(
        async (_token, _purpose, callback) => callback(securityToken, manager),
    )

    return {
        manager,
        save,
        securityToken,
        sessionRepository,
        userQueryBuilder,
        userRepository,
    }
}

describe('password setup sessions', () => {
    beforeEach(() => {
        passwordSetupMocks.consumeUsableSecurityToken.mockReset()
    })

    it('issues access and refresh tokens bound to a persisted session after setup', async () => {
        const user = {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'admin@example.com',
            name: 'Admin',
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            tokenVersion: 1,
            passwordHash: null,
            emailVerifiedAt: null,
            phone: null,
            avatarUrl: null,
            locale: 'en',
            provider: 'email',
        }
        const { manager, save, sessionRepository, userQueryBuilder } = setupConsumption(user)

        const result = await completePasswordSetup({
            token: 'a-valid-one-time-setup-token-value',
            password: 'Long-enough-passphrase-2026!',
            userAgent: 'test-browser',
            ipAddress: '127.0.0.1',
        })

        expect(save).toHaveBeenCalledWith(expect.objectContaining({
            passwordHash: 'hashed-password',
            emailVerifiedAt: expect.any(Date),
            tokenVersion: 2,
            status: UserStatus.Active,
        }))
        expect(userQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write')
        expect(sessionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: user.id,
            userAgent: 'test-browser',
            ipAddress: '127.0.0.1',
            revokedAt: null,
            expiresAt: expect.any(Date),
        }))
        expect(verifyAccessToken(result.accessToken).sessionId)
            .toBe('00000000-0000-4000-8000-000000000002')
        expect(verifyRefreshToken(result.refreshToken).sessionId)
            .toBe('00000000-0000-4000-8000-000000000002')
        expect(result.user.email).toBe('admin@example.com')
        expect(manager.getRepository).toHaveBeenCalledWith(UserEntity)
        expect(manager.getRepository).toHaveBeenCalledWith(UserSessionEntity)
    })

    it('re-reads the user under lock and rejects a setup racing with an admin block', async () => {
        const staleTokenRelationUser = {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'admin@example.com',
            name: 'Admin',
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            tokenVersion: 1,
            passwordHash: null,
            emailVerifiedAt: null,
            phone: null,
            avatarUrl: null,
            locale: 'en',
            provider: 'email',
        }
        const freshlyLockedBlockedUser = {
            ...staleTokenRelationUser,
            status: UserStatus.Blocked,
            tokenVersion: 2,
        }
        const { save, sessionRepository } = setupConsumption(
            staleTokenRelationUser,
            freshlyLockedBlockedUser,
        )

        await expect(completePasswordSetup({
            token: 'a-valid-one-time-setup-token-value',
            password: 'Long-enough-passphrase-2026!',
        })).rejects.toMatchObject({ statusCode: 403 })

        expect(staleTokenRelationUser.status).toBe(UserStatus.Active)
        expect(freshlyLockedBlockedUser.status).toBe(UserStatus.Blocked)
        expect(save).not.toHaveBeenCalled()
        expect(sessionRepository.save).not.toHaveBeenCalled()
    })
})
