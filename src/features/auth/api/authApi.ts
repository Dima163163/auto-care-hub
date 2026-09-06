import { baseApi } from '@/shared/api/baseApi'

import type { User } from '@/entities/user'
import { IS_MOCK_API } from '@/shared/config/api'
import type { DeploymentMarket, DeploymentOAuthProvider } from '@/shared/config/deployment'
import { clearAccessToken } from '@/shared/lib/auth-token'
import { clearCsrfToken } from '@/shared/lib/csrf-token'
import { clearIdentityScopedPwaCaches } from '@/shared/pwa/identity-cache'
import { clearMockSession } from '@/shared/lib/mock-session'
import { clearSessionExpired } from '@/shared/lib/auth-session-state'
import {
    normalizeAuthResponse,
    normalizeDeploymentCapabilitiesResponse,
    normalizeEmailVerificationTokenResponse,
    normalizeLogoutResponse,
    normalizeMeResponse,
    normalizeOAuthIdentitiesResponse,
    normalizeOAuthUrlResponse,
    normalizePasswordResetTokenResponse,
    normalizePasswordSetupTokenResponse,
    normalizeSuccessResponse,
    normalizeUserSessionsResponse,
} from '../lib/auth-response-schema'

export type AuthResponse = {
    user: User
    accessToken: string
}

export type MeResponse = {
    user: User
}

type LogoutResponse =
    | {
        success: true
    }
    | {
        message: string
    }

type LoginRequest = {
    email: string
    password: string
}

type RegisterRequest = {
    name: string
    email: string
    password: string
    role: 'client' | 'owner'
}

type VerifyPasswordSetupTokenRequest = {
    token: string
}

export type PasswordSetupTokenResponse = {
    email: string
    expiresAt: string
}

type CompletePasswordSetupRequest = {
    token: string
    password: string
}

type RequestPasswordResetRequest = {
    email: string
}

type SuccessResponse = {
    success: true
}

type VerifyPasswordResetTokenRequest = {
    token: string
}

export type PasswordResetTokenResponse = {
    email: string
    expiresAt: string
}

type CompletePasswordResetRequest = {
    token: string
    password: string
}

type VerifyEmailVerificationTokenRequest = {
    token: string
}

export type EmailVerificationTokenResponse = {
    email: string
    expiresAt: string
}

type CompleteEmailVerificationRequest = {
    token: string
}

export type OAuthProvider = DeploymentOAuthProvider

type OAuthUrlRequest = {
    provider: OAuthProvider
}

export type OAuthUrlResponse = {
    provider: OAuthProvider
    authUrl: string
}

export type DeploymentCapabilities = {
    deploymentMarket: DeploymentMarket
    auth: {
        oauthProviders: OAuthProvider[]
    }
}

export type OAuthIdentitySummary = {
    provider: OAuthProvider
    isLinked: boolean
    identityCount: number
    createdAt: string | null
    canUnlink: boolean
}

type ChangePasswordRequest = {
    oldPassword: string
    newPassword: string
}

export type UserSession = {
    id: string
    userAgent: string | null
    ipAddress: string | null
    lastActiveAt: string
    isCurrent: boolean
}

export const authApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // Данные текущего авторизованного пользователя
        getMe: build.query<User, void>({
            query: () => '/auth/me',
            transformResponse: normalizeMeResponse,
            providesTags: (result) =>
                result
                    ? [
                        {
                            type: 'User' as const,
                            id: result.id
                        },
                        {
                            type: 'User' as const,
                            id: 'ME'
                        }
                    ] : [
                        {
                            type: 'User' as const,
                            id: 'ME'
                        }
                    ]
        }),

        getDeploymentCapabilities: build.query<DeploymentCapabilities, void>({
            query: () => '/v1/deployment-capabilities',
            transformResponse: normalizeDeploymentCapabilitiesResponse,
        }),

        login: build.mutation<User, LoginRequest>({
            query: (body) => ({
                url: '/auth/login',
                method: 'POST',
                body
            }),
            transformResponse: normalizeAuthResponse,
            async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
                await queryFulfilled
                clearSessionExpired()
                await clearIdentityScopedPwaCaches()
                dispatch(baseApi.util.resetApiState())
            },
            invalidatesTags: [
                {
                    type: 'User',
                    id: 'ME'
                }
            ]
        }),

        logout: build.mutation<LogoutResponse, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            transformResponse: normalizeLogoutResponse,
            async onQueryStarted(_arg, { queryFulfilled }) {
                clearSessionExpired()
                clearAccessToken()
                clearCsrfToken()
                if (IS_MOCK_API) {
                    clearMockSession()
                }
                const identityCacheCleanup = clearIdentityScopedPwaCaches()

                try {
                    await queryFulfilled
                } finally {
                    await identityCacheCleanup
                    if (IS_MOCK_API) {
                        clearMockSession()
                    }
                }
            }
        }),

        register: build.mutation<User, RegisterRequest>({
            query: (body) => ({
                url: '/auth/register',
                method: 'POST',
                body
            }),
            transformResponse: normalizeAuthResponse,
            async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
                await queryFulfilled
                await clearIdentityScopedPwaCaches()
                dispatch(baseApi.util.resetApiState())
            },
            invalidatesTags: [
                {
                    type: 'User',
                    id: 'ME'
                },
                {
                    type: 'User',
                    id: 'ADMIN_LIST'
                },
                {
                    type: 'User',
                    id: 'CLIENT_LIST'
                }
            ]
        }),

        verifyPasswordSetupToken: build.mutation<
            PasswordSetupTokenResponse,
            VerifyPasswordSetupTokenRequest
        >({
            query: (body) => ({
                url: '/auth/password/setup/verify',
                method: 'POST',
                body,
            }),
            transformResponse: normalizePasswordSetupTokenResponse,
        }),

        completePasswordSetup: build.mutation<User, CompletePasswordSetupRequest>({
            query: (body) => ({
                url: '/auth/password/setup/complete',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeAuthResponse,
            invalidatesTags: [
                {
                    type: 'User',
                    id: 'ME',
                },
            ],
        }),

        requestPasswordReset: build.mutation<
            SuccessResponse,
            RequestPasswordResetRequest
        >({
            query: (body) => ({
                url: '/auth/password/reset/request',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeSuccessResponse,
        }),

        verifyPasswordResetToken: build.mutation<
            PasswordResetTokenResponse,
            VerifyPasswordResetTokenRequest
        >({
            query: (body) => ({
                url: '/auth/password/reset/verify',
                method: 'POST',
                body,
            }),
            transformResponse: normalizePasswordResetTokenResponse,
        }),

        completePasswordReset: build.mutation<
            SuccessResponse,
            CompletePasswordResetRequest
        >({
            query: (body) => ({
                url: '/auth/password/reset/complete',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeSuccessResponse,
            async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
                await queryFulfilled
                clearAccessToken()
                clearCsrfToken()
                await clearIdentityScopedPwaCaches()
                dispatch(baseApi.util.resetApiState())
            },
        }),

        googleMockLogin: build.mutation<User, void>({
            query: () => ({
                url: '/auth/google/mock',
                method: 'POST'
            }),
            transformResponse: normalizeAuthResponse,
            async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
                await queryFulfilled
                await clearIdentityScopedPwaCaches()
                dispatch(baseApi.util.resetApiState())
            },
            invalidatesTags: [
                { type: 'User', id: 'ME' }
            ]
        }),

        yandexMockLogin: build.mutation<User, void>({
            query: () => ({
                url: '/auth/yandex/mock',
                method: 'POST'
            }),
            transformResponse: normalizeAuthResponse,
            async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
                await queryFulfilled
                await clearIdentityScopedPwaCaches()
                dispatch(baseApi.util.resetApiState())
            },
            invalidatesTags: [
                { type: 'User', id: 'ME' }
            ]
        }),

        requestEmailVerification: build.mutation<SuccessResponse, void>({
            query: () => ({
                url: '/auth/email-verification/request',
                method: 'POST',
            }),
            transformResponse: normalizeSuccessResponse,
        }),

        getOAuthUrl: build.mutation<OAuthUrlResponse, OAuthUrlRequest>({
            query: ({ provider }) => ({
                url: `/auth/oauth/${provider}/url`,
                method: 'GET',
            }),
            transformResponse: normalizeOAuthUrlResponse,
        }),

        getOAuthIdentities: build.query<OAuthIdentitySummary[], void>({
            query: () => '/auth/oauth/identities',
            transformResponse: normalizeOAuthIdentitiesResponse,
            providesTags: ['OAuthIdentities'],
        }),

        getOAuthLinkUrl: build.mutation<OAuthUrlResponse, OAuthUrlRequest>({
            query: ({ provider }) => ({
                url: `/auth/oauth/${provider}/link/start`,
                method: 'POST',
            }),
            transformResponse: normalizeOAuthUrlResponse,
        }),

        getOAuthUnlinkUrl: build.mutation<OAuthUrlResponse, OAuthUrlRequest>({
            query: ({ provider }) => ({
                url: `/auth/oauth/${provider}/unlink/start`,
                method: 'POST',
            }),
            transformResponse: normalizeOAuthUrlResponse,
        }),

        verifyEmailVerificationToken: build.mutation<
            EmailVerificationTokenResponse,
            VerifyEmailVerificationTokenRequest
        >({
            query: (body) => ({
                url: '/auth/email-verification/verify',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeEmailVerificationTokenResponse,
        }),

        completeEmailVerification: build.mutation<
            SuccessResponse,
            CompleteEmailVerificationRequest
        >({
            query: (body) => ({
                url: '/auth/email-verification/complete',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeSuccessResponse,
            invalidatesTags: [
                { type: 'User', id: 'ME' }
            ]
        }),

        changePassword: build.mutation<SuccessResponse, ChangePasswordRequest>({
            query: (body) => ({
                url: '/auth/change-password',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeSuccessResponse,
        }),

        getSessions: build.query<UserSession[], void>({
            query: () => '/auth/sessions',
            transformResponse: normalizeUserSessionsResponse,
            providesTags: ['UserSessions'],
        }),

        revokeSession: build.mutation<SuccessResponse, string>({
            query: (id) => ({
                url: `/auth/sessions/${id}`,
                method: 'DELETE',
            }),
            transformResponse: normalizeSuccessResponse,
            invalidatesTags: ['UserSessions'],
        }),

        revokeAllSessions: build.mutation<SuccessResponse, void>({
            query: () => ({
                url: '/auth/sessions/revoke-all',
                method: 'POST',
            }),
            transformResponse: normalizeSuccessResponse,
            invalidatesTags: ['UserSessions', { type: 'User', id: 'ME' }],
        }),
    })
})

export const {
    useGetMeQuery,
    useGetDeploymentCapabilitiesQuery,
    useLoginMutation,
    useLogoutMutation,
    useRegisterMutation,
    useVerifyPasswordSetupTokenMutation,
    useCompletePasswordSetupMutation,
    useRequestPasswordResetMutation,
    useVerifyPasswordResetTokenMutation,
    useCompletePasswordResetMutation,
    useGoogleMockLoginMutation,
    useYandexMockLoginMutation,
    useRequestEmailVerificationMutation,
    useVerifyEmailVerificationTokenMutation,
    useCompleteEmailVerificationMutation,
    useChangePasswordMutation,
    useGetSessionsQuery,
    useRevokeSessionMutation,
    useRevokeAllSessionsMutation,
    useGetOAuthUrlMutation,
    useGetOAuthIdentitiesQuery,
    useGetOAuthLinkUrlMutation,
    useGetOAuthUnlinkUrlMutation,
} = authApi
