import { describe, expect, it } from 'vitest'

import {
    normalizeFavoriteResponse,
    normalizeFavoriteSuccessResponse,
    normalizeFavoritesResponse,
} from './favorites-response-schema'

const cabinet = {
    id: 'cabinet-1',
    ownerId: 'owner-1',
    title: 'Studio',
    description: 'A studio',
    address: 'Main street 1',
    city: 'Samara',
    pricePerHour: 1200,
    status: 'active' as const,
    photos: [],
    createdAt: '2026-08-01T00:00:00.000Z',
}

describe('favorites response schemas', () => {
    it('normalizes legacy arrays and current object responses', () => {
        expect(normalizeFavoritesResponse([cabinet])).toEqual([cabinet])
        expect(normalizeFavoritesResponse({ items: [cabinet] })).toEqual([cabinet])
        expect(normalizeFavoriteResponse(cabinet)).toEqual(cabinet)
    })

    it('rejects malformed cabinet and mutation responses', () => {
        expect(normalizeFavoriteSuccessResponse({ success: true }).success).toBe(true)
        expect(() => normalizeFavoritesResponse({ items: [{ ...cabinet, status: 'deleted' }] })).toThrow()
        expect(() => normalizeFavoriteResponse({ ...cabinet, pricePerHour: -1 })).toThrow()
        expect(() => normalizeFavoriteSuccessResponse({ success: false })).toThrow()
    })
})
