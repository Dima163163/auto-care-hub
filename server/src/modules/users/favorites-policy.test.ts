import { describe, expect, it } from 'vitest'

import {
    MAX_FAVORITES_PER_USER,
    normalizeFavoriteCabinetIds,
} from './favorites-policy.js'

describe('favorites policy', () => {
    it('deduplicates cabinet ids', () => {
        expect(normalizeFavoriteCabinetIds(['one', 'one', 'two'])).toEqual(['one', 'two'])
    })

    it('rejects oversized sync requests', () => {
        expect(() => normalizeFavoriteCabinetIds(
            Array.from({ length: MAX_FAVORITES_PER_USER + 1 }, (_, index) => `cabinet-${index}`),
        )).toThrow(/favorite/)
    })
})
