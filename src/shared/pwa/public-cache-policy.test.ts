import { describe, expect, it } from 'vitest'

import { isPublicDiscoveryRequest } from './public-cache-policy'

describe('public PWA cache policy', () => {
    it('allows anonymous AutoCare discovery GET requests', () => {
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/markets',
            hasAuthorization: false,
        })).toBe(true)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/markets/market-moscow/zones',
            hasAuthorization: false,
        })).toBe(true)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/discovery/providers',
            hasAuthorization: false,
        })).toBe(true)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/providers/provider-1',
            hasAuthorization: false,
        })).toBe(true)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/platform-reviews',
            hasAuthorization: false,
        })).toBe(true)
    })

    it('rejects private, mutating, and unrelated requests', () => {
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/discovery/providers',
            hasAuthorization: true,
        })).toBe(false)
        expect(isPublicDiscoveryRequest({
            method: 'POST',
            pathname: '/api/v1/service-requests',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/owner/autocare-providers',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/cabinets',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/service-requests',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicDiscoveryRequest({
            method: 'GET',
            pathname: '/api/v1/providers/provider-1/availability',
            hasAuthorization: false,
        })).toBe(false)
    })
})
