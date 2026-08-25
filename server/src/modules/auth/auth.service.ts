import { compare, hash } from 'bcryptjs'
import type { FastifyRequest } from 'fastify'

import { AppDataSource } from '../../database/data-source.js'
import { env } from '../../config/env.js'
import {
    UserEntity,
    UserProvider,
    UserRole,
    UserStatus,
} from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { createAccessToken, createRefreshToken } from './auth-token.js'
import { toPublicUser } from './public-user.js'
import {
    createSecurityToken,
    EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
    consumeUsableSecurityToken,
    findUsableSecurityToken,
    SecurityTokenPurpose,
} from './security-token.service.js'
import {
    createUserSession,
    revokeAllUserSessions,
    rotateUserSession,
} from './session.service.js'
import { assertCurrentSessionVersion } from './session-version.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { enqueueSecurityNotificationSafely } from '../outbox/security-notification-outbox.js'
import { getLoginLockDurationMs, isLoginLocked } from './login-lockout.js'
import { normalizeSecurityEventMetadata } from './security-event-metadata.js'
import {
    recordSecurityEvent as persistSecurityEvent,
} from './security-event-stream.js'
import {
    SecurityEventAuthOutcome,
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import { metrics } from '../../shared/observability/metrics.js'
import { logWarn } from '../../shared/observability/logger.js'
import {
    getFailedSecurityEventSinks,
    getSecurityEventSinkFailureMetadata,
    SECURITY_EVENT_SINK_FAILURE_INCIDENT_TITLE,
} from './security-event-sink.js'
import {
    SystemIncidentSeverity,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import { recordSystemIncidentSafely } from '../admin/system-incidents.service.js'
import { normalizeAuthEmail } from './email-policy.js'
import { normalizeAuthUserName } from './user-input-policy.js'
import {
    assertPasswordSecurityPolicy,
    assertPasswordVerificationInput,
} from './password-policy.js'

const PASSWORD_SALT_ROUNDS = 10

type SessionInfo = {
    userAgent?: string | null
    ipAddress?: string | null
    request?: FastifyRequest
}

type RegisterInput = {
    name: string
    email: string
    password: string
    role: 'client' | 'owner'
} & SessionInfo

type LoginInput = {
    email: string
    password: string
} & SessionInfo

type CompletePasswordSetupInput = {
    token: string
    password: string
}

type CompletePasswordResetInput = {
    token: string
    password: string
}

type ChangePasswordInput = {
    oldPassword: string
    newPassword: string
}

async function recordFailedLogin(userId: string) {
    return AppDataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(UserEntity)
        const user = await userRepository
            .createQueryBuilder('user')
            .where('user.id = :userId', { userId })
            .setLock('pessimistic_write')
            .getOneOrFail()

        const failedLoginAttempts = user.failedLoginAttempts + 1
        const lockDurationMs = getLoginLockDurationMs(failedLoginAttempts)
        const now = new Date()

        user.failedLoginAttempts = failedLoginAttempts
        user.lastFailedLoginAt = now
        user.lockedUntil = lockDurationMs > 0
            ? new Date(now.getTime() + lockDurationMs)
            : null

        return userRepository.save(user)
    })
}

async function resetFailedLogins(user: UserEntity) {
    if (user.failedLoginAttempts === 0 && !user.lockedUntil && !user.lastFailedLoginAt) return

    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastFailedLoginAt = null
    await AppDataSource.getRepository(UserEntity).save(user)
}

async function recordSecurityEvent(
    input: Parameters<typeof recordAuditLog>[0],
    actorRole?: UserRole | null,
) {
    try {
        const metadata = normalizeSecurityEventMetadata(input.metadata ?? {})
        const type = input.action === AuditAction.AccountLocked
            ? SecurityEventType.AccountLocked
            : input.action === AuditAction.RefreshTokenReuse
                ? SecurityEventType.RefreshTokenReuse
                : SecurityEventType.LoginFailed

        const sinkResults = await Promise.allSettled([
            recordAuditLog(input),
            persistSecurityEvent({
                userId: input.actorId,
                type,
                actorRole: actorRole ?? null,
                failedLoginAttempts: metadata.failedLoginAttempts,
                lockedUntil: metadata.lockedUntil ? new Date(metadata.lockedUntil) : null,
                ipAddress: metadata.ipAddress,
                request: input.request,
                severity: type === SecurityEventType.RefreshTokenReuse
                    ? SecurityEventSeverity.Critical
                    : type === SecurityEventType.AccountLocked
                        ? SecurityEventSeverity.High
                        : SecurityEventSeverity.Warning,
                authOutcome: SecurityEventAuthOutcome.Failed,
                reasonCode: type === SecurityEventType.AccountLocked
                    ? 'account_locked'
                    : type === SecurityEventType.RefreshTokenReuse
                        ? 'refresh_token_reuse'
                        : 'invalid_credentials',
                metadata,
            }),
        ])
        const failedSinks = getFailedSecurityEventSinks(sinkResults)
        for (const sink of failedSinks) {
            metrics.increment('security_event_sink_failures_total', 1, { sink })
            logWarn('Security event sink write failed', { sink })
        }
        if (failedSinks.length > 0) {
            void recordSystemIncidentSafely({
                type: SystemIncidentType.ServerError,
                severity: SystemIncidentSeverity.Critical,
                title: SECURITY_EVENT_SINK_FAILURE_INCIDENT_TITLE,
                requestId: input.request?.id,
                metadata: getSecurityEventSinkFailureMetadata(failedSinks),
            })
        }
    } catch (error: unknown) {
        metrics.increment('security_event_recording_failures_total')
        logWarn('Security event recording failed', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
        })
        // Authentication must remain available if security storage is degraded.
    }
}

function getRefreshTokenExpiry() {
    // jwtRefreshExpiresIn is '7d' by default
    const days = 7
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date
}

export function createAuthTokens(user: UserEntity, sessionId?: string) {
    const payload = {
        userId: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
        sessionId,
    }

    return {
        accessToken: createAccessToken(payload),
        refreshToken: createRefreshToken(payload),
    }
}

export async function registerUser(input: RegisterInput) {
    const userRepository = AppDataSource.getRepository(UserEntity)
    const email = normalizeAuthEmail(input.email)

    const existingUser = await userRepository.findOne({
        where: { email },
    })

    if (existingUser) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'User with this email already exists.',
        })
    }

    const password = await assertPasswordSecurityPolicy(input.password, {
        mode: env.auth.breachedPasswordCheckMode,
        timeoutMs: env.auth.breachedPasswordCheckTimeoutMs,
    })
    const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS)

    const user = userRepository.create({
        name: normalizeAuthUserName(input.name),
        email,
        passwordHash,
        phone: null,
        role: input.role === 'owner' ? UserRole.Owner : UserRole.Client,
        status: UserStatus.Active,
        avatarUrl: null,
        provider: UserProvider.Email,
        emailVerifiedAt: null,
    })

    const savedUser = await userRepository.save(user)

    const session = await createUserSession({
        userId: savedUser.id,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: getRefreshTokenExpiry(),
    })

    const tokens = createAuthTokens(savedUser, session.id)

    return {
        userEntity: savedUser,
        user: toPublicUser(savedUser),
        ...tokens,
    }
}

export async function loginUser(input: LoginInput) {
    const userRepository = AppDataSource.getRepository(UserEntity)
    const email = normalizeAuthEmail(input.email)

    const user = await userRepository.findOne({
        where: { email },
    })

    if (!user || !user.passwordHash) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Invalid email or password.',
        })
    }

    if (user.status === UserStatus.Blocked) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'User is blocked.',
        })
    }

    const now = new Date()
    if (isLoginLocked(user.lockedUntil, now)) {
        throw new AppError({
            statusCode: 429,
            code: ERROR_CODES.TooManyRequests,
            message: 'Too many failed login attempts. Try again later.',
        })
    }

    const isPasswordCorrect = await compare(assertPasswordVerificationInput(input.password), user.passwordHash)

    if (!isPasswordCorrect) {
        const failedLogin = await recordFailedLogin(user.id)
        const isLocked = isLoginLocked(
            failedLogin.lockedUntil,
            failedLogin.lastFailedLoginAt ?? new Date(),
        )

        await recordSecurityEvent({
            actorId: user.id,
            action: isLocked ? AuditAction.AccountLocked : AuditAction.LoginFailed,
            targetId: user.id,
            targetType: 'user',
            request: input.request,
            metadata: normalizeSecurityEventMetadata({
                failedLoginAttempts: failedLogin.failedLoginAttempts,
                lockedUntil: failedLogin.lockedUntil?.toISOString() ?? null,
                ipAddress: input.ipAddress ?? null,
            }),
        }, user.role)

        if (isLocked) {
            await enqueueSecurityNotificationSafely({
                type: 'account_locked',
                userId: user.id,
                lockedUntil: failedLogin.lockedUntil?.toISOString() ?? null,
            })
        }

        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Invalid email or password.',
        })
    }

    await resetFailedLogins(user)

    const session = await createUserSession({
        userId: user.id,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: getRefreshTokenExpiry(),
    })

    const tokens = createAuthTokens(user, session.id)

    return {
        user: toPublicUser(user),
        ...tokens,
    }
    }

    export async function loginMockUser(
    email: string,
    sessionInfo: SessionInfo
    ) {
    const userRepository = AppDataSource.getRepository(UserEntity)
    const user = await userRepository.findOne({
        where: { email },
    })

    if (!user) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Mock user not found.',
        })
    }

    if (user.status === UserStatus.Blocked) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'User is blocked.',
        })
    }

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

    export async function getUserById(userId: string, tokenVersion: number) {

    const userRepository = AppDataSource.getRepository(UserEntity)

    const user = await userRepository.findOne({
        where: { id: userId },
    })

    if (!user) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Invalid access token.',
        })
    }

    if (user.status === UserStatus.Blocked) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'User is blocked.',
        })
    }

    assertCurrentSessionVersion(user.tokenVersion, tokenVersion)

    return user
}

export async function refreshAuth(
    userId: string,
    tokenVersion: number,
    sessionId?: string,
    request?: FastifyRequest,
) {
    const user = await getUserById(userId, tokenVersion)

    if (sessionId) {
        const session = await rotateUserSession(sessionId, userId)

        if (!session) {
            await recordSecurityEvent({
                actorId: userId,
                action: AuditAction.RefreshTokenReuse,
                targetId: userId,
                targetType: 'user',
                request,
                metadata: {
                    sessionId,
                    source: 'refresh',
                },
            }, user.role)
            await enqueueSecurityNotificationSafely({
                type: 'refresh_token_reuse',
                userId,
                sessionId,
            })
            await revokeAllUserSessions(userId)
            throw new AppError({
                statusCode: 401,
                code: ERROR_CODES.Unauthorized,
                message: 'Refresh token reuse detected. Please login again.',
            })
        }

        sessionId = session.id
    }

    const tokens = createAuthTokens(user, sessionId)

    return {
        user: toPublicUser(user),
        ...tokens,
    }
}

export async function createPasswordSetupTokenForUser(user: UserEntity) {
    return createSecurityToken({
        user,
        purpose: SecurityTokenPurpose.PasswordSetup,
    })
}

export async function createEmailVerificationTokenForUser(user: UserEntity) {
    return createSecurityToken({
        user,
        purpose: SecurityTokenPurpose.EmailVerification,
        expiresInMinutes: EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
    })
}

export async function verifyPasswordSetupToken(token: string) {
    const securityToken = await findUsableSecurityToken(
        token,
        SecurityTokenPurpose.PasswordSetup
    )

    if (!securityToken) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Password setup link is invalid or expired.',
        })
    }

    return {
        email: securityToken.user.email,
        expiresAt: securityToken.expiresAt,
    }
}

export async function completePasswordSetup(input: CompletePasswordSetupInput) {
    const savedUser = await consumeUsableSecurityToken(
        input.token,
        SecurityTokenPurpose.PasswordSetup,
        async (securityToken, manager) => {
            const password = await assertPasswordSecurityPolicy(input.password, {
                mode: env.auth.breachedPasswordCheckMode,
                timeoutMs: env.auth.breachedPasswordCheckTimeoutMs,
            })
            const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS)

            securityToken.user.passwordHash = passwordHash
            securityToken.user.status = UserStatus.Active
            securityToken.user.tokenVersion += 1
            return manager.getRepository(UserEntity).save(securityToken.user)
        },
    )

    if (!savedUser) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Password setup link is invalid or expired.',
        })
    }

    const tokens = createAuthTokens(savedUser)

    return {
        user: toPublicUser(savedUser),
        ...tokens,
    }
}

export async function createPasswordResetTokenForEmail(emailInput: string) {
    const userRepository = AppDataSource.getRepository(UserEntity)
    const email = normalizeAuthEmail(emailInput)
    const user = await userRepository.findOne({
        where: {
            email,
        },
    })

    if (!user || user.provider !== UserProvider.Email) {
        return null
    }

    const securityToken = await createSecurityToken({
        user,
        purpose: SecurityTokenPurpose.PasswordReset,
    })

    return {
        email: user.email,
        locale: user.locale,
        ...securityToken,
    }
}

export async function verifyPasswordResetToken(token: string) {
    const securityToken = await findUsableSecurityToken(
        token,
        SecurityTokenPurpose.PasswordReset
    )

    if (!securityToken) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Password reset link is invalid or expired.',
        })
    }

    return {
        email: securityToken.user.email,
        expiresAt: securityToken.expiresAt,
    }
}

export async function completePasswordReset(input: CompletePasswordResetInput) {
    const completed = await consumeUsableSecurityToken(
        input.token,
        SecurityTokenPurpose.PasswordReset,
        async (securityToken, manager) => {
            const password = await assertPasswordSecurityPolicy(input.password, {
                mode: env.auth.breachedPasswordCheckMode,
                timeoutMs: env.auth.breachedPasswordCheckTimeoutMs,
            })
            const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS)

            securityToken.user.passwordHash = passwordHash
            securityToken.user.tokenVersion += 1
            await manager.getRepository(UserEntity).save(securityToken.user)
            return true
        },
    )

    if (!completed) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Password reset link is invalid or expired.',
        })
    }

    return {
        success: true,
    } as const
}

export async function verifyEmailVerificationToken(token: string) {
    const securityToken = await findUsableSecurityToken(
        token,
        SecurityTokenPurpose.EmailVerification
    )

    if (!securityToken) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Email verification link is invalid or expired.',
        })
    }

    return {
        email: securityToken.user.email,
        expiresAt: securityToken.expiresAt,
    }
}

export async function completeEmailVerification(token: string) {
    const completed = await consumeUsableSecurityToken(
        token,
        SecurityTokenPurpose.EmailVerification,
        async (securityToken, manager) => {
            securityToken.user.emailVerifiedAt = new Date()
            await manager.getRepository(UserEntity).save(securityToken.user)
            return true
        },
    )

    if (!completed) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Email verification link is invalid or expired.',
        })
    }

    return {
        success: true,
    } as const
}

export async function changePassword(user: UserEntity, input: ChangePasswordInput) {
    const userRepository = AppDataSource.getRepository(UserEntity)

    if (user.provider !== UserProvider.Email) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Password change is only available for email/password accounts.',
        })
    }

    if (!user.passwordHash) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Account does not have a password set.',
        })
    }

    const isOldPasswordCorrect = await compare(
        input.oldPassword,
        user.passwordHash
    )

    if (!isOldPasswordCorrect) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Invalid current password.',
        })
    }

    const newPassword = await assertPasswordSecurityPolicy(input.newPassword, {
        mode: env.auth.breachedPasswordCheckMode,
        timeoutMs: env.auth.breachedPasswordCheckTimeoutMs,
    })
    const newPasswordHash = await hash(newPassword, PASSWORD_SALT_ROUNDS)

    user.passwordHash = newPasswordHash
    user.tokenVersion += 1

    await userRepository.save(user)
    await revokeAllUserSessions(user.id)

    return {
        success: true,
    } as const
}
