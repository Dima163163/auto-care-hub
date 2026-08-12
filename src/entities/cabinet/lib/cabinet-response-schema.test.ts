import { describe, expect, it } from 'vitest'

import {
    normalizeDeleteCabinetResponse,
    normalizeCabinetListResponse,
    normalizeCabinetPageResponse,
    normalizeCabinetResponse,
    normalizeUploadCabinetImageResponse,
} from './cabinet-response-schema'

const cabinet = {
    id: 'cabinet-1',
    ownerId: 'owner-1',
    title: 'Studio',
    description: 'Quiet studio',
    address: 'Main street 1',
    city: 'Samara',
    pricePerHour: 1200,
    status: 'active' as const,
    photos: [],
    createdAt: '2026-01-01T00:00:00.000Z',
}

describe('cabinet response schemas', () => {
    it('parses single and list responses', () => {
        expect(normalizeCabinetResponse(cabinet)).toEqual(cabinet)
        expect(normalizeCabinetListResponse([cabinet])).toEqual([cabinet])
    })

    it('parses paginated responses', () => {
        expect(normalizeCabinetPageResponse({
            items: [cabinet],
            total: 1,
            page: 1,
            totalPages: 1,
        }).items).toHaveLength(1)
    })

    it('rejects invalid price and status values', () => {
        expect(() => normalizeCabinetResponse({ ...cabinet, pricePerHour: -1 })).toThrow()
        expect(() => normalizeCabinetResponse({ ...cabinet, status: 'published' })).toThrow()
    })

    it('accepts safe photo paths and rejects executable or insecure URLs', () => {
        expect(normalizeCabinetResponse({
            ...cabinet,
            photos: ['/images/cabinets/mock.webp', 'https://cdn.example.com/image.webp'],
        }).photos).toEqual(['/images/cabinets/mock.webp', 'https://cdn.example.com/image.webp'])
        expect(() => normalizeCabinetResponse({ ...cabinet, photos: ['javascript:alert(1)' ] })).toThrow()
        expect(() => normalizeCabinetResponse({ ...cabinet, photos: ['data:image/svg+xml;base64,abc'] })).toThrow()
        expect(() => normalizeCabinetResponse({ ...cabinet, photos: ['http://cdn.example.com/image.webp'] })).toThrow()
        expect(() => normalizeCabinetResponse({ ...cabinet, photos: ['//cdn.example.com/image.webp'] })).toThrow()
    })

    it('validates image upload and delete responses', () => {
        expect(normalizeUploadCabinetImageResponse({ url: '/uploads/cabinets/image.webp' }).url).toContain('/uploads/')
        expect(normalizeDeleteCabinetResponse({ success: true }).success).toBe(true)
        expect(() => normalizeUploadCabinetImageResponse({ url: '' })).toThrow()
        expect(() => normalizeUploadCabinetImageResponse({ url: 'javascript:alert(1)' })).toThrow()
        expect(() => normalizeDeleteCabinetResponse({ success: false })).toThrow()
    })
})
