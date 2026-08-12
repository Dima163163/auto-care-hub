import { describe, expect, it } from 'vitest'

import {
    AUTOMOTIVE_MOCK_PROVIDERS,
    AUTOMOTIVE_MOCK_SERVICES,
    AUTOCARE_MOCK_FALLBACK_IMAGE,
    resolveMockAssetUrl,
} from './autocare-mock-catalog.js'

describe('AutoCare mock catalog assets', () => {
    it('keeps generated image references on every seeded provider', () => {
        expect(AUTOMOTIVE_MOCK_PROVIDERS).toHaveLength(3)
        expect(AUTOMOTIVE_MOCK_PROVIDERS.every((provider) => provider.imageUrl?.endsWith('.webp'))).toBe(true)
        expect(AUTOMOTIVE_MOCK_SERVICES.length).toBeGreaterThanOrEqual(6)
    })

    it('falls back when an image is missing or unsafe', () => {
        expect(resolveMockAssetUrl(undefined, '/tmp/does-not-exist')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
        expect(resolveMockAssetUrl('https://example.com/image.webp', '/tmp/does-not-exist')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
    })

    it('rejects traversal outside the public asset root', () => {
        expect(resolveMockAssetUrl('/../private/image.webp', '/tmp/public')).toBe(AUTOCARE_MOCK_FALLBACK_IMAGE)
    })
})
