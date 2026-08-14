import { describe, expect, it } from 'vitest'

import {
    getDeploymentCapabilities,
    isDeploymentOAuthProviderAllowed,
    resolveDeploymentMarket,
} from './deployment-capabilities.js'

describe('deployment capabilities', () => {
    it('fails closed to the Russian profile when the value is missing or unknown', () => {
        expect(resolveDeploymentMarket(undefined)).toEqual({ market: 'ru', usedFallback: false })
        expect(resolveDeploymentMarket('unknown')).toEqual({ market: 'ru', usedFallback: true })
        expect(resolveDeploymentMarket(' GLOBAL ')).toEqual({ market: 'global', usedFallback: false })
    })

    it('exposes only Yandex for ru and both configured providers globally', () => {
        expect(getDeploymentCapabilities('ru').auth.oauthProviders).toEqual(['yandex'])
        expect(getDeploymentCapabilities('global').auth.oauthProviders).toEqual(['google', 'yandex'])
        expect(isDeploymentOAuthProviderAllowed('ru', 'google')).toBe(false)
        expect(isDeploymentOAuthProviderAllowed('ru', 'yandex')).toBe(true)
        expect(isDeploymentOAuthProviderAllowed('global', 'google')).toBe(true)
    })
})
