import { env } from '../../config/env.js'
import type { OAuthProvider } from './oauth.types.js'

const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const YANDEX_AUTHORIZATION_URL = 'https://oauth.yandex.com/authorize'

function getAuthorizationUrl(provider: OAuthProvider) {
    return provider === 'google'
        ? GOOGLE_AUTHORIZATION_URL
        : YANDEX_AUTHORIZATION_URL
}

function getProviderConfig(provider: OAuthProvider) {
    return env.oauth[provider]
}

export function buildOAuthAuthorizationUrl(
    provider: OAuthProvider,
    state: string
) {
    const providerConfig = getProviderConfig(provider)
    const authUrl = new URL(getAuthorizationUrl(provider))

    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', providerConfig.clientId)
    authUrl.searchParams.set('redirect_uri', providerConfig.redirectUri)
    authUrl.searchParams.set('state', state)

    if (provider === 'google') {
        authUrl.searchParams.set('scope', 'openid email profile')
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')
    }

    return authUrl.toString()
}