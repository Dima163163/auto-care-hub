import { describe, expect, it } from 'vitest'

import {
    MAX_FAVORITES_PER_USER,
    normalizeFavoriteCabinetId,
    normalizeFavoriteCabinetIds,
} from './favorites-policy.js'

describe('favorites policy', () => {
    it('deduplicates cabinet ids', () => {
        expect(normalizeFavoriteCabinetIds(['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'])).toEqual(['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'])
    })

    it('rejects oversized sync requests', () => {
        expect(() => normalizeFavoriteCabinetIds(
            Array.from({ length: MAX_FAVORITES_PER_USER + 1 }, (_, index) => `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`),
        )).toThrow(/favorite/)
    })

    it('rejects malformed values and canonicalizes individual ids', () => {
        expect(normalizeFavoriteCabinetId('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeFavoriteCabinetId('not-a-uuid')).toBeNull()
        expect(() => normalizeFavoriteCabinetIds(null)).toThrow(/invalid/)
        expect(() => normalizeFavoriteCabinetIds(['not-a-uuid'])).toThrow(/invalid/)
    })
})
