import type { FastifyInstance, FastifyRequest } from 'fastify'

import { env } from '../../config/env.js'
import { AppDataSource } from '../../database/data-source.js'
import {
    OAuthIdentityEntity,
    OAuthIdentityProvider,
} from '../../entities/oauth-identity/oauth-identity.entity.js'
import {
    OAuthLinkRequestEntity,
    OAuthLinkRequestPurpose,
} from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import { OAUTH_PROVIDERS } from './oauth.types.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { requireAuth } from '../auth/require-auth.js'
import { assertTrustedRequestOrigin } from '../../shared/security/csrf-origin.js'
import {
    normalizeOAuthCallbackCode,
    normalizeOAuthCallbackError,
    normalizeOAuthCallbackErrorDescription,
} from './oauth-callback-policy.js'
import { assertValidCsrfToken } from '../../shared/security/csrf-token.js'
import {
    validateParams,
    validateQuery,
} from '../../shared/validation/validate.js'
import {
    oauthCallbackQuerySchema,
    oauthProviderParamsSchema,
} from './oauth.schemas.js'
import {
    clearOAuthStateCookie,
    generateOAuthState,
    getOAuthStateValidationResult,
    hashOAuthState,
    setOAuthStateCookie,
} from './oauth-state.js'
import { buildOAuthAuthorizationUrl } from './oauth-url.js'
import {
    processOAuthCallback,
    processOAuthLinkCallback,
    processOAuthUnlinkCallback,
} from './oauth.service.js'
import { setRefreshTokenCookie } from '../auth/auth-cookie.js'
import type {
    OAuthAuthorizeResponse,
    OAuthIdentitySummary,
} from './oauth.types.js'
import {
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { recordSecurityActivitySafely } from '../auth/security-event-stream.js'

const OAUTH_LINK_TTL_MS = 10 * 60 * 1000

async function assertProtectedOAuthRequest(
    request: FastifyRequest
) {
    try {
        assertTrustedRequestOrigin(request, {
            allowedOrigins: env.corsOrigins,
            isProduction: env.nodeEnv === 'production',
        })
        assertValidCsrfToken(request)
    } catch (error) {
        void recordSecurityActivitySafely({
            type: SecurityEventType.CsrfViolation,
            severity: SecurityEventSeverity.High,
            statusCode: 403,
            request,
            metadata: { reason: error instanceof Error ? error.name : 'csrf_protection_rejected' },
        })
        throw error
    }
}

export async function oauthRoutes(app: FastifyInstance) {
    app.get<{ Reply: OAuthIdentitySummary[] }>(
        '/auth/oauth/identities',
        async (request) => {
            const user = await requireAuth(request)
            const repository = AppDataSource.getRepository(OAuthIdentityEntity)
            const identities = await repository.find({
                where: { userId: user.id },
                order: { createdAt: 'ASC' },
            })
            const hasPassword = Boolean(user.passwordHash)

            return OAUTH_PROVIDERS.map((provider) => {
                const identityProvider = provider === 'google'
                    ? OAuthIdentityProvider.Google
                    : OAuthIdentityProvider.Yandex
                const providerIdentities = identities.filter(
                    (identity) => identity.provider === identityProvider
                )
                const firstIdentity = providerIdentities[0]

                return {
                    provider,
                    isLinked: providerIdentities.length > 0,
                    identityCount: providerIdentities.length,
                    createdAt: firstIdentity?.createdAt.toISOString() ?? null,
                    canUnlink: Boolean(
                        firstIdentity &&
                        (hasPassword || identities.length > 1)
                    ),
                }
            })
        }
    )

    app.post<{ Params: unknown; Reply: OAuthAuthorizeResponse }>(
        '/auth/oauth/:provider/link/start',
        { preHandler: assertProtectedOAuthRequest },
        async (request, reply) => {
            const params = validateParams(
                oauthProviderParamsSchema,
                request.params
            )
            const user = await requireAuth(request)
            const state = generateOAuthState()
            const repository = AppDataSource.getRepository(OAuthLinkRequestEntity)
            const identityProvider = params.provider === 'google'
                ? OAuthIdentityProvider.Google
                : OAuthIdentityProvider.Yandex

            await repository.save(
                repository.create({
                    stateHash: hashOAuthState(state),
                    purpose: OAuthLinkRequestPurpose.Link,
                    provider: identityProvider,
                    userId: user.id,
                    identityId: null,
                    expiresAt: new Date(Date.now() + OAUTH_LINK_TTL_MS),
                    consumedAt: null,
                })
            )

            const authUrl = buildOAuthAuthorizationUrl(params.provider, state)
            setOAuthStateCookie(reply, params.provider, state)

            return {
                provider: params.provider,
                authUrl,
            }
        }
    )

    app.post<{ Params: unknown; Reply: OAuthAuthorizeResponse }>(
        '/auth/oauth/:provider/unlink/start',
        { preHandler: assertProtectedOAuthRequest },
        async (request, reply) => {
            const params = validateParams(
                oauthProviderParamsSchema,
                request.params
            )
            const user = await requireAuth(request)
            const identityProvider = params.provider === 'google'
                ? OAuthIdentityProvider.Google
                : OAuthIdentityProvider.Yandex
            const identityRepository = AppDataSource.getRepository(OAuthIdentityEntity)
            const identities = await identityRepository.find({
                where: {
                    userId: user.id,
                    provider: identityProvider,
                },
            })

            if (identities.length === 0) {
                throw new AppError({
                    statusCode: 409,
                    code: ERROR_CODES.OAuthIdentityNotLinked,
                    message: 'This OAuth provider is not linked to the account.',
                })
            }

            if (identities.length > 1) {
                throw new AppError({
                    statusCode: 400,
                    code: ERROR_CODES.BadRequest,
                    message: 'Multiple identities for this provider require an identity-specific unlink flow.',
                })
            }

            const identity = identities[0]

            if (!identity) {
                throw new AppError({
                    statusCode: 409,
                    code: ERROR_CODES.OAuthIdentityNotLinked,
                    message: 'This OAuth provider is not linked to the account.',
                })
            }

            if (!user.passwordHash && identities.length === 1) {
                const totalIdentityCount = await identityRepository.count({
                    where: { userId: user.id },
                })

                if (totalIdentityCount <= 1) {
                    throw new AppError({
                        statusCode: 409,
                        code: ERROR_CODES.OAuthLastLoginMethod,
                        message: 'The last available login method cannot be removed.',
                    })
                }
            }

            const state = generateOAuthState()
            const repository = AppDataSource.getRepository(OAuthLinkRequestEntity)

            await repository.save(
                repository.create({
                    stateHash: hashOAuthState(state),
                    purpose: OAuthLinkRequestPurpose.Unlink,
                    provider: identityProvider,
                    userId: user.id,
                    identityId: identity.id,
                    expiresAt: new Date(Date.now() + OAUTH_LINK_TTL_MS),
                    consumedAt: null,
                })
            )

            const authUrl = buildOAuthAuthorizationUrl(params.provider, state)
            setOAuthStateCookie(reply, params.provider, state)

            return {
                provider: params.provider,
                authUrl,
            }
        }
    )

    app.get<{ Params: unknown; Reply: OAuthAuthorizeResponse }>(
        '/auth/oauth/:provider/url',
        async (request, reply) => {
            const params = validateParams(
                oauthProviderParamsSchema,
                request.params
            )
            const state = generateOAuthState()
            const authUrl = buildOAuthAuthorizationUrl(params.provider, state)

            setOAuthStateCookie(reply, params.provider, state)

            return {
                provider: params.provider,
                authUrl,
            }
        }
    )

    app.get<{
        Params: unknown
        Querystring: unknown
    }>('/auth/oauth/:provider/callback', async (request, reply) => {
        const params = validateParams(oauthProviderParamsSchema, request.params)
        const validatedQuery = validateQuery(oauthCallbackQuerySchema, request.query)
        const query = {
            ...validatedQuery,
            code: validatedQuery.code ? normalizeOAuthCallbackCode(validatedQuery.code) : validatedQuery.code,
            error: validatedQuery.error ? normalizeOAuthCallbackError(validatedQuery.error) : validatedQuery.error,
            error_description: validatedQuery.error_description
                ? normalizeOAuthCallbackErrorDescription(validatedQuery.error_description)
                : validatedQuery.error_description,
        }

        const redirectToLogin = (error: string) => {
            const errorUrl = new URL('/login', env.frontendOrigin)
            errorUrl.searchParams.set('error', error)
            return reply.redirect(errorUrl.toString())
        }

        const oauthStateResult = getOAuthStateValidationResult(
            request.cookies[env.oauth.stateCookieName],
            params.provider,
            query.state,
        )

        if (oauthStateResult !== 'valid') {
            clearOAuthStateCookie(reply)
            request.log.warn(
                { provider: params.provider, result: oauthStateResult },
                'OAuth callback rejected because state is invalid'
            )
            return redirectToLogin('oauth_state_invalid')
        }

        // Consume state before exchanging the code so retries cannot replay it.
        clearOAuthStateCookie(reply)

        const linkRequest = query.state
            ? await AppDataSource.getRepository(OAuthLinkRequestEntity).findOne({
                where: { stateHash: hashOAuthState(query.state) },
            })
            : null

        if (linkRequest) {
            if (query.error || !query.code) {
                const errorUrl = new URL('/profile', env.frontendOrigin)
                errorUrl.searchParams.set(
                    'oauth',
                    linkRequest.purpose === OAuthLinkRequestPurpose.Link
                        ? 'link_failed'
                        : 'unlink_failed'
                )
                errorUrl.searchParams.set('tab', 'security')
                return reply.redirect(errorUrl.toString())
            }

            try {
                if (linkRequest.purpose === OAuthLinkRequestPurpose.Link) {
                    await processOAuthLinkCallback(
                        params.provider,
                        query.code,
                        linkRequest.stateHash,
                        {
                            ipAddress: request.ip,
                            userAgent: request.headers['user-agent'],
                            correlationId: request.id,
                        }
                    )
                } else {
                    await processOAuthUnlinkCallback(
                        params.provider,
                        query.code,
                        linkRequest.stateHash,
                        {
                            ipAddress: request.ip,
                            userAgent: request.headers['user-agent'],
                            correlationId: request.id,
                        }
                    )
                }

                const successUrl = new URL('/profile', env.frontendOrigin)
                successUrl.searchParams.set(
                    'oauth',
                    linkRequest.purpose === OAuthLinkRequestPurpose.Link
                        ? 'linked'
                        : 'unlinked'
                )
                successUrl.searchParams.set('provider', params.provider)
                successUrl.searchParams.set('tab', 'security')
                return reply.redirect(successUrl.toString())
            } catch (error) {
                request.log.error(
                    {
                        err: error,
                        operation: linkRequest.purpose === OAuthLinkRequestPurpose.Link
                            ? 'oauth-link'
                            : 'oauth-unlink',
                        provider: params.provider,
                    },
                    'OAuth identity linking failed'
                )
                const errorUrl = new URL('/profile', env.frontendOrigin)
                errorUrl.searchParams.set(
                    'oauth',
                    linkRequest.purpose === OAuthLinkRequestPurpose.Link
                        ? 'link_failed'
                        : 'unlink_failed'
                )
                errorUrl.searchParams.set('tab', 'security')
                return reply.redirect(errorUrl.toString())
            }
        }

        if (query.error) {
            return redirectToLogin('oauth_failed')
        }

        if (!query.code) {
            return redirectToLogin('no_code')
        }

        try {
            const result = await processOAuthCallback(params.provider, query.code, {
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
            })

            setRefreshTokenCookie(reply, result.refreshToken)

            const successUrl = new URL('/login/callback', env.frontendOrigin)

            return reply.redirect(successUrl.toString())
        } catch (error) {
            request.log.error(
                {
                    err: error,
                    operation: 'oauth-callback',
                    provider: params.provider,
                },
                'OAuth callback processing failed'
            )
            return redirectToLogin('processing_failed')
        }
    })
    }
