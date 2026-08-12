export const OAUTH_PROVIDERS = ['google', 'yandex'] as const

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

export type OAuthAuthorizeResponse = {
    provider: OAuthProvider
    authUrl: string
}

export type OAuthIdentitySummary = {
    provider: OAuthProvider
    isLinked: boolean
    identityCount: number
    createdAt: string | null
    canUnlink: boolean
}

export type OAuthCallbackResponse = {
    provider: OAuthProvider
    status: 'callback_received'
    message: string
    hasCode: boolean
    hasState: boolean
    hasError: boolean
}
