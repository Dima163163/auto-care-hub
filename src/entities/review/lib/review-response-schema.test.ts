import { describe, expect, it } from 'vitest'

import {
    normalizeAdminReviewListResponse,
    normalizeClientReviewListResponse,
    normalizeDeleteReviewResponse,
    normalizeReviewListResponse,
} from './review-response-schema'

const review = {
    id: 'review-1',
    cabinetId: 'cabinet-1',
    clientId: 'client-1',
    rating: 5,
    text: 'Excellent session.',
    status: 'approved' as const,
    createdAt: '2026-08-01T00:00:00.000Z',
    client: { id: 'client-1', name: 'Client' },
}

describe('review response schemas', () => {
    it('validates role-specific review lists', () => {
        expect(normalizeReviewListResponse([review])).toHaveLength(1)
        expect(normalizeClientReviewListResponse([{
            ...review,
            cabinet: { id: 'cabinet-1', title: 'Studio' },
        }])).toHaveLength(1)
        expect(normalizeAdminReviewListResponse([{
            ...review,
            cabinet: { id: 'cabinet-1', title: 'Studio' },
            bookingId: 'booking-1',
            updatedAt: '2026-08-01T01:00:00.000Z',
        }])).toHaveLength(1)
        expect(normalizeDeleteReviewResponse({ success: true }).success).toBe(true)
    })

    it('rejects invalid rating, status, and admin metadata', () => {
        expect(() => normalizeReviewListResponse([{ ...review, rating: 6 }])).toThrow()
        expect(() => normalizeReviewListResponse([{ ...review, status: 'unknown' }])).toThrow()
        expect(() => normalizeAdminReviewListResponse([review])).toThrow()
        expect(() => normalizeDeleteReviewResponse({ success: false })).toThrow()
    })
})
