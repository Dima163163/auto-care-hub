import type { FastifyInstance, FastifyRequest } from 'fastify'

import { validateBody } from '../../shared/validation/validate.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { env } from '../../config/env.js'
import { assertTrustedRequestOrigin } from '../../shared/security/csrf-origin.js'
import {
    assertValidCsrfToken,
    clearCsrfTokenCookie,
    createCsrfToken,
    setCsrfTokenCookie,
} from '../../shared/security/csrf-token.js'
import {
    createRateLimitPreHandler,
    getAuthenticatedUserRateLimitIdentifier,
    getEmailRateLimitIdentifier,
} from '../../shared/security/rate-limit.js'
import {
    completePasswordResetSchema,
    completePasswordSetupSchema,
    loginSchema,
    passwordResetTokenSchema,
    passwordSetupTokenSchema,
    registerSchema,
    requestPasswordResetSchema,
    emailVerificationTokenSchema,
    changePasswordSchema,
    } from './auth.schemas.js'
    import { verifyAccessToken, verifyRefreshToken } from './auth-token.js'
    import {
    clearRefreshTokenCookie,
    getRefreshTokenFromCookie,
    setRefreshTokenCookie,
    } from './auth-cookie.js'
    import {
    changePassword,
    completeEmailVerification,
    completePasswordReset,
    completePasswordSetup,
    createEmailVerificationTokenForUser,
    createPasswordResetTokenForEmail,
    loginMockUser,
    loginUser,
    refreshAuth,
    registerUser,
    verifyEmailVerificationToken,
    verifyPasswordResetToken,
    verifyPasswordSetupToken,
} from './auth.service.js'
import {
    listUserSessions,
    revokeAllUserSessions,
    revokeUserSession,
} from './session.service.js'
import { toPublicSession, type PublicSession } from './session-response.js'
import { toPublicUser, type PublicUser } from './public-user.js'
import { requireAuth } from './require-auth.js'
import { enqueuePasswordResetEmailSafely } from '../outbox/email-outbox.service.js'
import { enqueueEmailVerificationSafely } from '../outbox/email-verification-outbox.service.js'
import { getEmailLocale } from '../../shared/i18n/request-locale.js'
import { serializeError } from '../../shared/observability/logger.js'
import {
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { recordSecurityActivitySafely } from './security-event-stream.js'

type AuthResponse = {
    user: PublicUser
    accessToken: string
}

type SuccessResponse = {
    success: true
}

type MeResponse = {
    user: PublicUser
}

type LogoutResponse = {
    success: true
}

type PasswordSetupTokenResponse = {
    email: string
    expiresAt: string
}

type PasswordResetRequestResponse = {
    success: true
}

type PasswordResetTokenResponse = {
    email: string
    expiresAt: string
}

type EmailVerificationTokenResponse = {
    email: string
    expiresAt: string
}

type EmailVerificationCompleteResponse = {
    success: true
}

type UserSessionResponse = PublicSession

type CsrfTokenResponse = {
    csrfToken: string
}

const ONE_MINUTE_MS = 60 * 1000

const registerRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'auth:register',
    windowMs: ONE_MINUTE_MS,
    keyResolvers: [getEmailRateLimitIdentifier],
})

const loginRateLimit = createRateLimitPreHandler({
    maxRequests: 10,
    scope: 'auth:login',
    windowMs: ONE_MINUTE_MS,
    keyResolvers: [getEmailRateLimitIdentifier],
})

const refreshRateLimit = createRateLimitPreHandler({
    maxRequests: 30,
    scope: 'auth:refresh',
    windowMs: ONE_MINUTE_MS,
})

const passwordSetupRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'auth:password-setup',
    windowMs: ONE_MINUTE_MS,
})

const passwordResetRequestRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'auth:password-reset-request',
    windowMs: ONE_MINUTE_MS,
    keyResolvers: [getEmailRateLimitIdentifier],
})

const passwordResetTokenRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'auth:password-reset-token',
    windowMs: ONE_MINUTE_MS,
})

const emailVerificationRequestRateLimit = createRateLimitPreHandler({
    maxRequests: 3,
    scope: 'auth:email-verification-request',
    windowMs: 15 * ONE_MINUTE_MS, // 15 minutes
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

const emailVerificationTokenRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'auth:email-verification-token',
    windowMs: ONE_MINUTE_MS,
})

const changePasswordRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'auth:change-password',
    windowMs: 15 * ONE_MINUTE_MS,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

async function assertTrustedAuthOrigin(
    request: FastifyRequest
) {
    assertTrustedRequestOrigin(request, {
        allowedOrigins: env.corsOrigins,
        isProduction: env.nodeEnv === 'production',
    })
}

async function assertProtectedAuthRequest(
    request: FastifyRequest
) {
    try {
        await assertTrustedAuthOrigin(request)
        assertValidCsrfToken(request)
    } catch (error) {
        void recordSecurityActivitySafely({
            type: SecurityEventType.CsrfViolation,
            severity: SecurityEventSeverity.High,
            statusCode: 403,
            request,
            reasonCode: error instanceof AppError ? error.code : 'csrf_protection_rejected',
            metadata: { reason: error instanceof AppError ? error.code : 'csrf_protection_rejected' },
        })
        throw error
    }
}

function verifyRefreshTokenOrThrow(refreshToken: string) {
    try {
        return verifyRefreshToken(refreshToken)
    } catch {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Invalid or expired refresh token.',
        })
    }
}

export async function authRoutes(
    app: FastifyInstance
) {
    app.get<{ Reply: CsrfTokenResponse }>('/auth/csrf', async (_request, reply) => {
        const csrfToken = createCsrfToken()

        setCsrfTokenCookie(reply, csrfToken)

        return {
            csrfToken,
        }
    })

    app.post<{ Body: unknown; Reply: AuthResponse }>(
        '/auth/register',
        {
            preHandler: [registerRateLimit, assertProtectedAuthRequest],
        },
        async (request, reply) => {
            const body = validateBody(registerSchema, request.body)
            const result = await registerUser({
                ...body,
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
                request,
            })

            const verificationToken = await createEmailVerificationTokenForUser(
                result.userEntity
            )

            try {
                await enqueueEmailVerificationSafely({
                    email: result.userEntity.email,
                    expiresAt: verificationToken.expiresAt,
                    frontendOrigin: env.frontendOrigin,
                    token: verificationToken.token,
                    locale: getEmailLocale(result.userEntity.locale, request),
                })
            } catch (error) {
                request.log.error(
                    {
                        error: serializeError(error),
                    },
                    'Failed to send registration email verification'
                )
            }

            setRefreshTokenCookie(reply, result.refreshToken)

            return {
                user: result.user,
                accessToken: result.accessToken,
            }
        }
    )

    app.post<{ Body: unknown; Reply: AuthResponse }>(
        '/auth/login',
        {
            preHandler: [loginRateLimit, assertProtectedAuthRequest],
        },
        async (request, reply) => {
            const body = validateBody(loginSchema, request.body)
            const result = await loginUser({
                ...body,
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
            })

            setRefreshTokenCookie(reply, result.refreshToken)

            return {
                user: result.user,
                accessToken: result.accessToken,
            }
        }
    )

    app.post<{ Reply: AuthResponse }>(
        '/auth/refresh',
        {
            preHandler: [refreshRateLimit, assertProtectedAuthRequest],
        },
        async (request, reply) => {
            const refreshToken = getRefreshTokenFromCookie(request)
            const payload = verifyRefreshTokenOrThrow(refreshToken)
            const result = await refreshAuth(
                payload.userId,
                payload.tokenVersion,
                payload.sessionId,
                request,
            )

            setRefreshTokenCookie(reply, result.refreshToken)

            return {
                user: result.user,
                accessToken: result.accessToken,
            }
        }
    )

    app.get<{ Reply: MeResponse }>('/auth/me', async (request) => {
        const user = await requireAuth(request)

        return {
            user: toPublicUser(user),
        }
    })

    app.post<{ Reply: LogoutResponse }>(
        '/auth/logout',
        {
            preHandler: assertProtectedAuthRequest,
        },
        async (request, reply) => {
            try {
                const refreshToken = getRefreshTokenFromCookie(request)
                const payload = verifyRefreshTokenOrThrow(refreshToken)

                if (payload.sessionId) {
                    await revokeUserSession(payload.sessionId, payload.userId)
                }
            } catch {
                // Ignore logout errors (e.g. invalid refresh token)
            }

            clearRefreshTokenCookie(reply)
            clearCsrfTokenCookie(reply)

            return {
                success: true,
            }
        }
    )

    app.get<{ Reply: UserSessionResponse[] }>(
        '/auth/sessions',
        async (request) => {
            const user = await requireAuth(request)

            let currentSessionId: string | undefined
            try {
                const token = request.headers.authorization?.split(' ')[1]
                if (token) {
                    const payload = verifyAccessToken(token)
                    currentSessionId = payload.sessionId
                }
            } catch {
                // Ignore
            }

            const sessions = await listUserSessions(user.id)

            return sessions.map((session) => toPublicSession(session, currentSessionId ?? null))
        }
    )

    app.post<{ Reply: SuccessResponse }>(
        '/auth/sessions/revoke-all',
        {
            preHandler: assertProtectedAuthRequest,
        },
        async (request) => {
            const user = await requireAuth(request)
            await revokeAllUserSessions(user.id)

            return {
                success: true,
            }
        }
    )

    app.delete<{ Params: { id: string }; Reply: SuccessResponse }>(
        '/auth/sessions/:id',
        {
            preHandler: assertProtectedAuthRequest,
        },
        async (request) => {
            const user = await requireAuth(request)
            await revokeUserSession(request.params.id, user.id)

            return {
                success: true,
            }
        }
    )

    app.post<{ Body: unknown; Reply: PasswordSetupTokenResponse }>(
        '/auth/password/setup/verify',
        {
            preHandler: passwordSetupRateLimit,
        },
        async (request) => {
            const body = validateBody(passwordSetupTokenSchema, request.body)
            const result = await verifyPasswordSetupToken(body.token)

            return {
                email: result.email,
                expiresAt: result.expiresAt.toISOString(),
            }
        }
    )

    app.post<{ Body: unknown; Reply: AuthResponse }>(
        '/auth/password/setup/complete',
        {
            preHandler: [passwordSetupRateLimit, assertProtectedAuthRequest],
        },
        async (request, reply) => {
            const body = validateBody(completePasswordSetupSchema, request.body)
            const result = await completePasswordSetup(body)

            setRefreshTokenCookie(reply, result.refreshToken)

            return {
                user: result.user,
                accessToken: result.accessToken,
            }
        }
    )

    app.post<{ Body: unknown; Reply: PasswordResetRequestResponse }>(
        '/auth/password/reset/request',
        {
            preHandler: [
                passwordResetRequestRateLimit,
                assertProtectedAuthRequest,
            ],
        },
        async (request) => {
            const body = validateBody(requestPasswordResetSchema, request.body)
            const passwordResetToken =
                await createPasswordResetTokenForEmail(body.email)

            if (passwordResetToken) {
                try {
                    await enqueuePasswordResetEmailSafely({
                        email: passwordResetToken.email,
                        expiresAt: passwordResetToken.expiresAt,
                        frontendOrigin: env.frontendOrigin,
                        token: passwordResetToken.token,
                        locale: getEmailLocale(passwordResetToken.locale, request),
                    })
                } catch (error) {
                    request.log.error(
                        {
                            error: serializeError(error),
                        },
                        'Failed to send password reset email'
                    )
                }
            }

            return {
                success: true,
            }
        }
    )

    app.post<{ Body: unknown; Reply: PasswordResetTokenResponse }>(
        '/auth/password/reset/verify',
        {
            preHandler: passwordResetTokenRateLimit,
        },
        async (request) => {
            const body = validateBody(passwordResetTokenSchema, request.body)
            const result = await verifyPasswordResetToken(body.token)

            return {
                email: result.email,
                expiresAt: result.expiresAt.toISOString(),
            }
        }
    )

    app.post<{ Body: unknown; Reply: PasswordResetRequestResponse }>(
        '/auth/password/reset/complete',
        {
            preHandler: [
                passwordResetTokenRateLimit,
                assertProtectedAuthRequest,
            ],
        },
        async (request, reply) => {
            const body = validateBody(completePasswordResetSchema, request.body)
            const result = await completePasswordReset(body)

            clearRefreshTokenCookie(reply)
            clearCsrfTokenCookie(reply)

            return result
        }
    )

    app.post<{ Reply: EmailVerificationCompleteResponse }>(
        '/auth/email-verification/request',
        {
            preHandler: [
                emailVerificationRequestRateLimit,
                assertProtectedAuthRequest,
            ],
        },
        async (request) => {
            const user = await requireAuth(request)

            if (user.emailVerifiedAt) {
                throw new AppError({
                    statusCode: 400,
                    code: ERROR_CODES.BadRequest,
                    message: 'Email is already verified.',
                })
            }

            const verificationToken =
                await createEmailVerificationTokenForUser(user)

            try {
                await enqueueEmailVerificationSafely({
                    email: user.email,
                    expiresAt: verificationToken.expiresAt,
                    frontendOrigin: env.frontendOrigin,
                    token: verificationToken.token,
                    locale: getEmailLocale(user.locale, request),
                })
            } catch (error) {
                request.log.error(
                    {
                        error: serializeError(error),
                    },
                    'Failed to send email verification email'
                )
            }

            return {
                success: true,
            }
        }
    )

    app.post<{ Body: unknown; Reply: EmailVerificationTokenResponse }>(
        '/auth/email-verification/verify',
        {
            preHandler: emailVerificationTokenRateLimit,
        },
        async (request) => {
            const body = validateBody(emailVerificationTokenSchema, request.body)
            const result = await verifyEmailVerificationToken(body.token)

            return {
                email: result.email,
                expiresAt: result.expiresAt.toISOString(),
            }
        }
    )

    app.post<{ Body: unknown; Reply: EmailVerificationCompleteResponse }>(
        '/auth/email-verification/complete',
        {
            preHandler: [
                emailVerificationTokenRateLimit,
                assertProtectedAuthRequest,
            ],
        },
        async (request) => {
            const body = validateBody(emailVerificationTokenSchema, request.body)
            const result = await completeEmailVerification(body.token)

            return result
        }
    )

    app.post<{ Body: unknown; Reply: SuccessResponse }>(
        '/auth/change-password',
        {
            preHandler: [
                changePasswordRateLimit,
                assertProtectedAuthRequest,
            ],
        },
        async (request) => {
            const user = await requireAuth(request)
            const body = validateBody(changePasswordSchema, request.body)

            return changePassword(user, body)
        }
    )

    if (env.nodeEnv === 'development') {
        app.post<{ Reply: AuthResponse }>(
            '/auth/google/mock',
            async (request, reply) => {
                const result = await loginMockUser('client@example.com', {
                    userAgent: request.headers['user-agent'],
                    ipAddress: request.ip,
                })

                setRefreshTokenCookie(reply, result.refreshToken)

                return {
                    user: result.user,
                    accessToken: result.accessToken,
                }
            }
        )

        app.post<{ Reply: AuthResponse }>(
            '/auth/yandex/mock',
            async (request, reply) => {
                const result = await loginMockUser('client@example.com', {
                    userAgent: request.headers['user-agent'],
                    ipAddress: request.ip,
                })

                setRefreshTokenCookie(reply, result.refreshToken)

                return {
                    user: result.user,
                    accessToken: result.accessToken,
                }
            }
        )
    }
}
