import { describe, expect, it } from 'vitest'

import {
    normalizeAutoCarePublicProviderUuid,
    normalizeAutoCarePublicReviewLimit,
    normalizeAutoCarePublicServiceId,
} from './public-provider-input-policy.js'

const providerId = '11111111-1111-4111-8111-111111111111'

describe('public provider input policy', () => {
    it('canonicalizes provider UUIDs', () => {
        expect(normalizeAutoCarePublicProviderUuid(` ${providerId.toUpperCase()} `)).toBe(providerId)
        expect(normalizeAutoCarePublicProviderUuid('not-a-uuid')).toBeNull()
    })

    it('bounds public review limits and applies the service default', () => {
        expect(normalizeAutoCarePublicReviewLimit(undefined, 20)).toBe(20)
        expect(normalizeAutoCarePublicReviewLimit(50, 20)).toBe(50)
        expect(normalizeAutoCarePublicReviewLimit(0, 20)).toBeNull()
        expect(normalizeAutoCarePublicReviewLimit(51, 20)).toBeNull()
        expect(normalizeAutoCarePublicReviewLimit(1.5, 20)).toBeNull()
    })

    it('normalizes bounded service lookup values', () => {
        expect(normalizeAutoCarePublicServiceId('  brake-pads  ')).toBe('brake-pads')
        expect(normalizeAutoCarePublicServiceId('')).toBeNull()
        expect(normalizeAutoCarePublicServiceId('x'.repeat(121))).toBeNull()
        expect(normalizeAutoCarePublicServiceId(null)).toBeNull()
    })
})
