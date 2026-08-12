import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import {
    AuditLogEntity,
} from '../../entities/audit-log/audit-log.entity.js'
import {
    OAuthIdentityEntity,
    OAuthIdentityProvider,
} from '../../entities/oauth-identity/oauth-identity.entity.js'
import {
    OAuthLinkRequestEntity,
    OAuthLinkRequestPurpose,
} from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { hashOAuthState } from './oauth-state.js'
import { processOAuthLinkCallback } from './oauth.service.js'

describe('OAuth link callback integration', () => {
    let userId: string
    let linkRequestId: string
    const state = 'a'.repeat(64)
    const stateHash = hashOAuthState(state)

    beforeAll(async () => {
        const user = await AppDataSource.getRepository(UserEntity).save(
            AppDataSource.getRepository(UserEntity).create({
                name: 'OAuth Integration User',
                email: `oauth-integration-${Date.now()}@example.com`,
                role: UserRole.Client,
                status: UserStatus.Active,
                passwordHash: 'password-hash',
                emailVerifiedAt: new Date(),
            }),
        )
        userId = user.id

        const linkRequest = await AppDataSource.getRepository(OAuthLinkRequestEntity).save(
            AppDataSource.getRepository(OAuthLinkRequestEntity).create({
                stateHash,
                purpose: OAuthLinkRequestPurpose.Link,
                provider: OAuthIdentityProvider.Google,
                userId,
                identityId: null,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                consumedAt: null,
            }),
        )
        linkRequestId = linkRequest.id
    })

    afterAll(async () => {
        vi.restoreAllMocks()
        if (!AppDataSource.isInitialized) return

        await AppDataSource.transaction(async (manager) => {
            await manager.query("SELECT set_config('app.audit_retention_cleanup', 'on', true)")
            await manager.getRepository(AuditLogEntity).delete({ actorId: userId })
        })
        await AppDataSource.getRepository(OAuthIdentityEntity).delete({ userId })
        await AppDataSource.getRepository(OAuthLinkRequestEntity).delete({ id: linkRequestId })
        await AppDataSource.getRepository(UserEntity).delete({ id: userId })
    })

    it('consumes one OAuth state when two callbacks race', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = String(input)
            if (url.includes('oauth2.googleapis.com/token')) {
                return new Response(JSON.stringify({
                    access_token: 'oauth-integration-access-token',
                    expires_in: 3_600,
                    scope: 'openid email profile',
                    token_type: 'Bearer',
                    id_token: 'oauth-integration-id-token',
                }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                })
            }

            return new Response(JSON.stringify({
                sub: 'oauth-integration-provider-subject',
                name: 'OAuth Integration User',
                email: 'oauth-integration-profile@example.com',
                email_verified: true,
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })
        })

        const results = await Promise.allSettled([
            processOAuthLinkCallback('google', 'oauth-integration-code', stateHash, {}),
            processOAuthLinkCallback('google', 'oauth-integration-code', stateHash, {}),
        ])

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
        expect(await AppDataSource.getRepository(OAuthIdentityEntity).countBy({
            userId,
            provider: OAuthIdentityProvider.Google,
        })).toBe(1)

        const consumedRequest = await AppDataSource.getRepository(OAuthLinkRequestEntity)
            .findOneByOrFail({ id: linkRequestId })
        expect(consumedRequest.consumedAt).not.toBeNull()
    })
})
