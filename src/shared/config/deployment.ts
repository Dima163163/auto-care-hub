export const DEPLOYMENT_MARKETS = ['ru', 'global'] as const

export type DeploymentMarket = (typeof DEPLOYMENT_MARKETS)[number]
export type DeploymentOAuthProvider = 'google' | 'yandex'

const configuredMarket = import.meta.env.VITE_DEPLOYMENT_MARKET?.trim().toLowerCase()

export const DEPLOYMENT_MARKET: DeploymentMarket = DEPLOYMENT_MARKETS.includes(
    configuredMarket as DeploymentMarket,
)
    ? configuredMarket as DeploymentMarket
    : 'ru'

export const STATIC_DEPLOYMENT_CAPABILITIES = {
    deploymentMarket: DEPLOYMENT_MARKET,
    auth: {
        oauthProviders: (DEPLOYMENT_MARKET === 'global'
            ? ['google', 'yandex']
            : ['yandex']) as DeploymentOAuthProvider[],
    },
} as const

export function isDeploymentOAuthProviderEnabled(provider: DeploymentOAuthProvider) {
    return STATIC_DEPLOYMENT_CAPABILITIES.auth.oauthProviders.includes(provider)
}
