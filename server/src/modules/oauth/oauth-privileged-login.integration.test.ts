import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { OAuthIdentityEntity, OAuthIdentityProvider } from '../../entities/oauth-identity/oauth-identity.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { processOAuthCallback } from './oauth.service.js'

describe('privileged OAuth login integration', () => {
    afterEach(() => vi.restoreAllMocks())

    it.each([UserRole.Admin, UserRole.SuperAdmin])('does not issue a %s session from a linked identity', async (role) => {
        const subject = `privileged-login-${role}-${Date.now()}`
        const email = `${subject}@example.com`
        const userRepository = AppDataSource.getRepository(UserEntity)
        const identityRepository = AppDataSource.getRepository(OAuthIdentityEntity)
        const user = await userRepository.save(userRepository.create({
            name: 'Privileged OAuth User',
            email,
            role,
            status: UserStatus.Active,
            passwordHash: 'password-hash',
            emailVerifiedAt: new Date(),
        }))

        try {
            await identityRepository.save(identityRepository.create({
                provider: OAuthIdentityProvider.Google,
                providerSubject: subject,
                userId: user.id,
            }))

            vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
                if (String(input).includes('oauth2.googleapis.com/token')) {
                    return new Response(JSON.stringify({
                        access_token: 'privileged-oauth-access-token',
                        expires_in: 3_600,
                        scope: 'openid email profile',
                        token_type: 'Bearer',
                        id_token: 'privileged-oauth-id-token',
                    }), { status: 200, headers: { 'content-type': 'application/json' } })
                }

                return new Response(JSON.stringify({
                    sub: subject,
                    name: 'Privileged OAuth User',
                    email,
                    email_verified: true,
                }), { status: 200, headers: { 'content-type': 'application/json' } })
            })

            await expect(processOAuthCallback('google', 'privileged-oauth-code', {}))
                .rejects.toThrow(/Privileged accounts/)
            expect(await AppDataSource.getRepository(UserSessionEntity).countBy({ userId: user.id })).toBe(0)
        } finally {
            await identityRepository.delete({ userId: user.id })
            await userRepository.delete({ id: user.id })
        }
    })
})
