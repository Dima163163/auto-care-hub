export {
    useGetMeQuery,
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
    type UserSession,
    type OAuthIdentitySummary,
    } from './api/authApi'

export { CurrentUserBadge } from './ui/current-user-badge/CurrentUserBadge'
export { CurrentUserMenu } from './ui/current-user-menu/CurrentUserMenu'
export { AuthHeaderActions } from './ui/auth-header-actions/AuthHeaderActions'
export { LogoutButton } from './ui/logout-button/LogoutButton'
export { RequireAuth } from './ui/require-auth/RequireAuth'
export { RequireGuest } from './ui/require-guest/RequireGuest'
export { getDefaultRouteByRole } from './lib/getDefaultRouteByRole'
export { getAccountLinkTranslationKey } from './lib/getAccountLinkTranslationKey'
export { SocialAuthButtons } from './ui/social-auth-buttons/SocialAuthButtons'
