import { describe, expect, it } from 'vitest'

import { isPublicCatalogRequest } from './public-cache-policy'

describe('public PWA cache policy', () => {
    it('allows anonymous catalog GET requests', () => {
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/cabinets',
            hasAuthorization: false,
        })).toBe(true)
        expect(isPublicCatalogRequest({
            method: 'get',
            pathname: '/api/cabinets/cabinet-1',
            hasAuthorization: false,
        })).toBe(true)
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/cabinets/123e4567-e89b-12d3-a456-426614174000',
            hasAuthorization: false,
        })).toBe(true)
    })

    it('rejects private, mutating, and unrelated requests', () => {
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/cabinets',
            hasAuthorization: true,
        })).toBe(false)
        expect(isPublicCatalogRequest({
            method: 'POST',
            pathname: '/api/cabinets',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/owner/cabinets',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/cabinets/all',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/cabinets/private/metadata',
            hasAuthorization: false,
        })).toBe(false)
        expect(isPublicCatalogRequest({
            method: 'GET',
            pathname: '/api/cabinets/private',
            hasAuthorization: false,
        })).toBe(false)
    })
})
