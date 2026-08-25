import { z } from 'zod'

import type { User } from '@/entities/user'
import { userSchema } from '@/entities/user/lib/user-response-schema'
import { setAccessToken } from '@/shared/lib/auth-token'
import type {
    EmailVerificationTokenResponse,
    DeploymentCapabilities,
    OAuthIdentitySummary,
    OAuthUrlResponse,
    PasswordResetTokenResponse,
    PasswordSetupTokenResponse,
    UserSession,
} from '../api/authApi'

const tokenResponseSchema = z.object({
    email: z.string().email(),
    expiresAt: z.string().datetime({ offset: true }),
})

const successResponseSchema = z.object({
    success: z.literal(true),
})

const logoutResponseSchema = z.union([
    successResponseSchema,
    z.object({ message: z.string().min(1) }),
])

const oauthUrlResponseSchema = z.object({
    provider: z.enum(['google', 'yandex']),
    authUrl: z.string().refine((value) => {
        if (value.startsWith('/') && !value.startsWith('//')) return true

        try {
            return new URL(value).protocol === 'https:'
        } catch {
            return false
        }
    }, 'OAuth URL must be a secure external URL or an internal relative path.'),
}) satisfies z.ZodType<OAuthUrlResponse>

const oauthIdentitySchema = z.object({
    provider: z.enum(['google', 'yandex']),
    isLinked: z.boolean(),
    identityCount: z.number().int().nonnegative(),
    createdAt: z.string().datetime({ offset: true }).nullable(),
    canUnlink: z.boolean(),
}) satisfies z.ZodType<OAuthIdentitySummary>

const deploymentCapabilitiesSchema = z.object({
    deploymentMarket: z.enum(['ru', 'global']),
    auth: z.object({
        oauthProviders: z.array(z.enum(['google', 'yandex'])),
    }),
}) satisfies z.ZodType<DeploymentCapabilities>

const userSessionSchema = z.object({
    id: z.string(),
    userAgent: z.string().nullable(),
    ipAddress: z.string().nullable(),
    lastActiveAt: z.string().datetime({ offset: true }),
    isCurrent: z.boolean(),
}) satisfies z.ZodType<UserSession>

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

export function parseUserResponse(value: unknown): User {
    const candidate = isRecord(value) && 'user' in value ? value.user : value

    return userSchema.parse(candidate)
}

export function normalizeMeResponse(value: unknown): User {
    return parseUserResponse(value)
}

export function normalizeAuthResponse(value: unknown): User {
    if (!isRecord(value) || typeof value.accessToken !== 'string') {
        return parseUserResponse(value)
    }

    const user = parseUserResponse(value.user)
    setAccessToken(value.accessToken)

    return user
}

export function normalizeSuccessResponse(value: unknown) {
    return successResponseSchema.parse(value)
}

export function normalizeLogoutResponse(value: unknown) {
    return logoutResponseSchema.parse(value)
}

export function normalizePasswordSetupTokenResponse(value: unknown): PasswordSetupTokenResponse {
    return tokenResponseSchema.parse(value)
}

export function normalizePasswordResetTokenResponse(value: unknown): PasswordResetTokenResponse {
    return tokenResponseSchema.parse(value)
}

export function normalizeEmailVerificationTokenResponse(value: unknown): EmailVerificationTokenResponse {
    return tokenResponseSchema.parse(value)
}

export function normalizeOAuthUrlResponse(value: unknown): OAuthUrlResponse {
    return oauthUrlResponseSchema.parse(value)
}

export function normalizeOAuthIdentitiesResponse(value: unknown): OAuthIdentitySummary[] {
    return z.array(oauthIdentitySchema).parse(value)
}

export function normalizeDeploymentCapabilitiesResponse(value: unknown): DeploymentCapabilities {
    return deploymentCapabilitiesSchema.parse(value)
}

export function normalizeUserSessionsResponse(value: unknown): UserSession[] {
    return z.array(userSessionSchema).parse(value)
}
