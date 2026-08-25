export const DEPLOYMENT_MARKETS = ['ru', 'global'] as const
export type DeploymentMarket = (typeof DEPLOYMENT_MARKETS)[number]

export const DEPLOYMENT_OAUTH_PROVIDERS = ['google', 'yandex'] as const
export type DeploymentOAuthProvider = (typeof DEPLOYMENT_OAUTH_PROVIDERS)[number]

export type DeploymentCapabilities = {
    deploymentMarket: DeploymentMarket
    auth: {
        oauthProviders: readonly DeploymentOAuthProvider[]
    }
}

export function resolveDeploymentMarket(value: string | undefined) {
    const normalized = value?.trim().toLowerCase()

    if (normalized && DEPLOYMENT_MARKETS.includes(normalized as DeploymentMarket)) {
        return { market: normalized as DeploymentMarket, usedFallback: false }
    }

    return { market: 'ru' as const, usedFallback: Boolean(normalized) }
}

export function getDeploymentCapabilities(market: DeploymentMarket): DeploymentCapabilities {
    return {
        deploymentMarket: market,
        auth: {
            oauthProviders: market === 'global'
                ? [...DEPLOYMENT_OAUTH_PROVIDERS]
                : ['yandex'],
        },
    }
}

export function isDeploymentOAuthProviderAllowed(
    market: DeploymentMarket,
    provider: DeploymentOAuthProvider,
) {
    return getDeploymentCapabilities(market).auth.oauthProviders.includes(provider)
}
