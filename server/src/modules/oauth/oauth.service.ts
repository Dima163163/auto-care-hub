import { env } from '../../config/env.js'
import { AppDataSource } from '../../database/data-source.js'
import {
    UserEntity,
    UserProvider,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import {
    OAuthIdentityEntity,
    OAuthIdentityProvider,
} from '../../entities/oauth-identity/oauth-identity.entity.js'
import { OAuthLinkRequestEntity } from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import { OAuthLinkRequestPurpose } from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import {
    AuditAction,
    AuditLogEntity,
} from '../../entities/audit-log/audit-log.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { fetchWithRetry } from '../../shared/http/fetch-with-retry.js'
import { createAuthTokens } from '../auth/auth.service.js'
import { createUserSession } from '../auth/session.service.js'
import { toPublicUser } from '../auth/public-user.js'
import type { OAuthProvider } from './oauth.types.js'
import { normalizeOAuthProfile } from './oauth-profile.js'
import { normalizeOAuthProviderSubject } from './oauth-identity-policy.js'
import { normalizeOAuthCallbackCode } from './oauth-callback-policy.js'
import { getOAuthLinkRequestDecision } from './oauth-link-request-policy.js'
import { readJsonResponse } from '../../shared/http/read-json-response.js'
import {
    googleProfileResponseSchema,
    googleTokenResponseSchema,
    yandexProfileResponseSchema,
    yandexTokenResponseSchema,
    type GoogleProfileResponse,
    type YandexProfileResponse,
} from './oauth-response-schemas.js'

type OAuthUserProfile = {
    providerId: string
    email: string
    name: string
    avatarUrl: string | null
    isEmailVerified: boolean
}

type OAuthAuditContext = {
    ipAddress?: string | null
    userAgent?: string | null
    correlationId?: string | null
}

function fetchOAuthRequest(input: string | URL, init: RequestInit) {
    return fetchWithRetry(input, init, {
        timeoutMs: env.oauth.requestTimeoutMs,
        maxRetries: env.oauth.maxRetries,
    })
}

function getIdentityProvider(provider: OAuthProvider) {
    return provider === 'google'
        ? OAuthIdentityProvider.Google
        : OAuthIdentityProvider.Yandex
}

function updateUserFromOAuthProfile(
    user: UserEntity,
    oauthProfile: OAuthUserProfile
) {
    if (user.status === UserStatus.Blocked) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'User is blocked.',
        })
    }

    user.name = user.name || oauthProfile.name
    if (!user.avatarUrl && oauthProfile.avatarUrl) {
        user.avatarUrl = oauthProfile.avatarUrl
    }

    if (!user.emailVerifiedAt && oauthProfile.isEmailVerified) {
        user.emailVerifiedAt = new Date()
    }
}

async function exchangeGoogleCode(code: string) {
    const response = await fetchOAuthRequest('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: env.oauth.google.clientId,
            client_secret: env.oauth.google.clientSecret,
            redirect_uri: env.oauth.google.redirectUri,
            grant_type: 'authorization_code',
        }).toString(),
    })

    if (!response.ok) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Failed to exchange Google OAuth code.',
        })
    }

    return googleTokenResponseSchema.parse(await readJsonResponse<unknown>(response))
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetchOAuthRequest('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (!response.ok) {
        throw new Error('Failed to fetch Google profile')
    }

    const profile: GoogleProfileResponse = googleProfileResponseSchema.parse(
        await readJsonResponse<unknown>(response),
    )

    return normalizeOAuthProfile({
        providerId: profile.sub,
        email: profile.email.toLowerCase(),
        name: profile.name,
        avatarUrl: profile.picture ?? null,
        isEmailVerified: profile.email_verified,
    })
}

async function exchangeYandexCode(code: string) {
    const response = await fetchOAuthRequest('https://oauth.yandex.ru/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: env.oauth.yandex.clientId,
            client_secret: env.oauth.yandex.clientSecret,
            grant_type: 'authorization_code',
        }).toString(),
    })

    if (!response.ok) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Failed to exchange Yandex OAuth code.',
        })
    }

    return yandexTokenResponseSchema.parse(await readJsonResponse<unknown>(response))
}

async function fetchYandexProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetchOAuthRequest('https://login.yandex.ru/info?format=json', {
        headers: {
            Authorization: `OAuth ${accessToken}`,
        },
    })

    if (!response.ok) {
        throw new Error('Failed to fetch Yandex profile')
    }

    const profile: YandexProfileResponse = yandexProfileResponseSchema.parse(
        await readJsonResponse<unknown>(response),
    )

    return normalizeOAuthProfile({
        providerId: profile.id,
        email: profile.default_email.toLowerCase(),
        name: profile.display_name || profile.real_name || 'Yandex User',
        avatarUrl: profile.is_avatar_empty || !profile.default_avatar_id
            ? null
            : `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`,
        isEmailVerified: true, // Yandex usually requires verification for main email
    })
}

async function fetchOAuthProfile(provider: OAuthProvider, code: string) {
    if (provider === 'google') {
        const tokenRes = await exchangeGoogleCode(code)
        return fetchGoogleProfile(tokenRes.access_token)
    }

    const tokenRes = await exchangeYandexCode(code)
    return fetchYandexProfile(tokenRes.access_token)
}

function getRefreshTokenExpiry() {
    const days = 7
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date
}

export async function processOAuthCallback(
    provider: OAuthProvider,
    code: string,
    sessionInfo: { userAgent?: string | null; ipAddress?: string | null }
) {
    const oauthProfile = await fetchOAuthProfile(provider, normalizeOAuthCallbackCode(code))

    const identityProvider = getIdentityProvider(provider)
    const providerSubject = normalizeOAuthProviderSubject(oauthProfile.providerId)
    const user = await AppDataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(UserEntity)
        const identityRepository = manager.getRepository(OAuthIdentityEntity)
        const identity = await identityRepository.findOne({
            where: {
                provider: identityProvider,
                providerSubject,
            },
        })

        if (identity) {
            const linkedUser = await userRepository.findOne({
                where: { id: identity.userId },
            })

            if (!linkedUser) {
                throw new AppError({
                    statusCode: 500,
                    code: ERROR_CODES.InternalServerError,
                    message: 'OAuth identity points to a missing user.',
                })
            }

            updateUserFromOAuthProfile(linkedUser, oauthProfile)

            return userRepository.save(linkedUser)
        }

        const existingUser = await userRepository.findOne({
            where: { email: oauthProfile.email },
        })

        if (existingUser) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.OAuthIdentityNotLinked,
                message: 'This OAuth account is not linked to the existing user account.',
            })
        }

        const newUser = await userRepository.save(
            userRepository.create({
                name: oauthProfile.name,
                email: oauthProfile.email,
                passwordHash: null,
                phone: null,
                role: UserRole.Client,
                status: UserStatus.Active,
                avatarUrl: oauthProfile.avatarUrl,
                provider: provider === 'google' ? UserProvider.Google : UserProvider.Yandex,
                emailVerifiedAt: oauthProfile.isEmailVerified ? new Date() : null,
            })
        )

        await identityRepository.save(
            identityRepository.create({
                provider: identityProvider,
                providerSubject,
                userId: newUser.id,
            })
        )

        return newUser
    })

    const session = await createUserSession({
        userId: user.id,
        userAgent: sessionInfo.userAgent,
        ipAddress: sessionInfo.ipAddress,
        expiresAt: getRefreshTokenExpiry(),
    })

    const tokens = createAuthTokens(user, session.id)

    return {
        user: toPublicUser(user),
        ...tokens,
    }
}

export async function processOAuthLinkCallback(
    provider: OAuthProvider,
    code: string,
    stateHash: string,
    auditContext: OAuthAuditContext
) {
    const oauthProfile = await fetchOAuthProfile(provider, code)
    const identityProvider = getIdentityProvider(provider)
    const providerSubject = normalizeOAuthProviderSubject(oauthProfile.providerId)

    return AppDataSource.transaction(async (manager) => {
        const linkRequestRepository = manager.getRepository(OAuthLinkRequestEntity)
        const linkRequest = await linkRequestRepository.findOne({
            where: { stateHash },
            lock: { mode: 'pessimistic_write' },
        })

        const decision = getOAuthLinkRequestDecision({
            exists: Boolean(linkRequest),
            providerMatches: linkRequest?.provider === identityProvider,
            purposeMatches: linkRequest?.purpose === OAuthLinkRequestPurpose.Link,
            consumed: Boolean(linkRequest?.consumedAt),
            expiresAt: linkRequest?.expiresAt ?? null,
        })
        if (decision !== 'ready' || !linkRequest) {
            throw new AppError({
                statusCode: 400,
                code: ERROR_CODES.BadRequest,
                message: 'OAuth link request is invalid or expired.',
            })
        }

        const userRepository = manager.getRepository(UserEntity)
        const identityRepository = manager.getRepository(OAuthIdentityEntity)
        const user = await userRepository.findOne({
            where: { id: linkRequest.userId },
        })

        if (!user) {
            throw new AppError({
                statusCode: 500,
                code: ERROR_CODES.InternalServerError,
                message: 'OAuth link request points to a missing user.',
            })
        }

        updateUserFromOAuthProfile(user, oauthProfile)

        const existingIdentity = await identityRepository.findOne({
            where: {
                provider: identityProvider,
                providerSubject,
            },
        })

        if (existingIdentity && existingIdentity.userId !== user.id) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.OAuthIdentityAlreadyLinked,
                message: 'This OAuth account is already linked to another user.',
            })
        }

        if (!existingIdentity) {
            const newIdentity = await identityRepository.save(
                identityRepository.create({
                    provider: identityProvider,
                    providerSubject,
                    userId: user.id,
                })
            )

            await manager.getRepository(AuditLogEntity).save({
                actorId: user.id,
                action: AuditAction.OAuthIdentityLinked,
                targetId: newIdentity.id,
                targetType: 'oauth_identity',
                metadata: { provider },
                ipAddress: auditContext.ipAddress ?? null,
                userAgent: auditContext.userAgent ?? null,
                correlationId: auditContext.correlationId ?? null,
            })
        }

        await userRepository.save(user)
        linkRequest.consumedAt = new Date()
        await linkRequestRepository.save(linkRequest)

        return toPublicUser(user)
    })
}

export async function processOAuthUnlinkCallback(
    provider: OAuthProvider,
    code: string,
    stateHash: string,
    auditContext: OAuthAuditContext
) {
    const oauthProfile = await fetchOAuthProfile(provider, code)
    const identityProvider = getIdentityProvider(provider)
    const providerSubject = normalizeOAuthProviderSubject(oauthProfile.providerId)

    return AppDataSource.transaction(async (manager) => {
        const linkRequestRepository = manager.getRepository(OAuthLinkRequestEntity)
        const linkRequest = await linkRequestRepository.findOne({
            where: { stateHash },
            lock: { mode: 'pessimistic_write' },
        })

        const decision = getOAuthLinkRequestDecision({
            exists: Boolean(linkRequest),
            providerMatches: linkRequest?.provider === identityProvider,
            purposeMatches: linkRequest?.purpose === OAuthLinkRequestPurpose.Unlink,
            consumed: Boolean(linkRequest?.consumedAt),
            expiresAt: linkRequest?.expiresAt ?? null,
        })
        if (decision !== 'ready' || !linkRequest || !linkRequest.identityId) {
            throw new AppError({
                statusCode: 400,
                code: ERROR_CODES.BadRequest,
                message: 'OAuth unlink request is invalid or expired.',
            })
        }

        const userRepository = manager.getRepository(UserEntity)
        const identityRepository = manager.getRepository(OAuthIdentityEntity)
        const user = await userRepository.findOne({
            where: { id: linkRequest.userId },
        })
        const identity = await identityRepository.findOne({
            where: { id: linkRequest.identityId },
        })

        if (
            !user ||
            !identity ||
            identity.userId !== user.id ||
            identity.provider !== identityProvider ||
            identity.providerSubject !== providerSubject
        ) {
            throw new AppError({
                statusCode: 400,
                code: ERROR_CODES.BadRequest,
                message: 'OAuth unlink re-verification did not match the linked identity.',
            })
        }

        const identityCount = await identityRepository.count({
            where: { userId: user.id },
        })

        if (!user.passwordHash && identityCount <= 1) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.OAuthLastLoginMethod,
                message: 'The last available login method cannot be removed.',
            })
        }

        await identityRepository.remove(identity)
        linkRequest.consumedAt = new Date()
        await linkRequestRepository.save(linkRequest)
        await manager.getRepository(AuditLogEntity).save({
            actorId: user.id,
            action: AuditAction.OAuthIdentityUnlinked,
            targetId: identity.id,
            targetType: 'oauth_identity',
            metadata: { provider },
            ipAddress: auditContext.ipAddress ?? null,
            userAgent: auditContext.userAgent ?? null,
            correlationId: auditContext.correlationId ?? null,
        })

        return toPublicUser(user)
    })
}
